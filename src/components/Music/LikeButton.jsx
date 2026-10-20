import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../utils/enums";
import { extractErrorMessage } from "../../services/api";
import * as likeService from "../../services/likeService";
import { IconHeart } from "../Common/Icons";

// Nút tim: guest bấm sẽ được chuyển sang trang đăng nhập; ADMIN không có tim.
export default function LikeButton({ song, className = "btn-icon" }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const userKey = user ? String(user.id ?? user.email ?? user.username ?? "u") : "";

  useEffect(() => {
    let cancelled = false;
    const sync = () =>
      Promise.resolve().then(() => {
        if (cancelled) return;
        if (!userKey) {
          setLiked(false);
          return;
        }
        likeService.loadLikedIds().then((ids) => !cancelled && setLiked(ids.has(String(song.id))));
      });
    sync();
    window.addEventListener("mw:likes-changed", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("mw:likes-changed", sync);
    };
  }, [song.id, userKey]);

  if (user?.role === Role.ADMIN) return null;

  const toggle = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (busy) return;
    const next = !liked;
    setBusy(true);
    setLiked(next); // cập nhật ngay cho mượt, lỗi thì hoàn lại
    try {
      await likeService.setLiked(song, next);
    } catch (err) {
      setLiked(!next);
      window.alert(extractErrorMessage(err, t("common.likeFailed")));
    } finally {
      setBusy(false);
    }
  };

  const label = liked ? t("common.unlike") : t("common.like");
  return (
    <button className={className} aria-label={label} title={label} aria-pressed={liked} onClick={toggle}>
      <IconHeart filled={liked} />
    </button>
  );
}
