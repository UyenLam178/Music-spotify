/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { getLikedSongs, saveLikedSongs, toLikedSnapshot } from "../services/likeService";

const LikeContext = createContext(null);

export function LikeProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  // Danh sách thích gắn với từng tài khoản; đổi tài khoản thì nạp lại ngay trong lúc render.
  const [state, setState] = useState(() => ({ uid, list: uid != null ? getLikedSongs(uid) : [] }));
  let current = state;
  if (state.uid !== uid) {
    current = { uid, list: uid != null ? getLikedSongs(uid) : [] };
    setState(current);
  }

  const likedIds = useMemo(() => new Set(current.list.map((s) => String(s.id))), [current.list]);

  const isLiked = useCallback((songId) => likedIds.has(String(songId)), [likedIds]);

  // Trả về true nếu thao tác được thực hiện, false nếu chưa đăng nhập.
  const toggleLike = useCallback(
    (song) => {
      if (uid == null || !song) return false;
      setState((prev) => {
        const exists = prev.list.some((s) => String(s.id) === String(song.id));
        const list = exists
          ? prev.list.filter((s) => String(s.id) !== String(song.id))
          : [toLikedSnapshot(song), ...prev.list];
        saveLikedSongs(uid, list);
        return { uid, list };
      });
      return true;
    },
    [uid]
  );

  const value = useMemo(
    () => ({ likedSongs: current.list, isLiked, toggleLike, canLike: uid != null }),
    [current.list, isLiked, toggleLike, uid]
  );

  return <LikeContext.Provider value={value}>{children}</LikeContext.Provider>;
}

export const useLikes = () => {
  const ctx = useContext(LikeContext);
  if (!ctx) throw new Error("useLikes phải được dùng bên trong LikeProvider");
  return ctx;
};
