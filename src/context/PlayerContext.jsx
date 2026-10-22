import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { tokenStorage } from "../services/api";
import { useAuth } from "./AuthContext";
import { getSongById, recordPlay } from "../services/songService";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const audioRef = useRef(null);
  if (audioRef.current === null) audioRef.current = new Audio();
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // off | all | one
  // Panel "Đang phát" bên phải (video + lời + menu ⋯)
  const [panelOpen, setPanelOpen] = useState(false);

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  const handleNext = (autoAdvance = false) => {
    if (!queue.length) return;
    if (repeatMode === "one" && autoAdvance) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === "all") nextIndex = 0;
        else {
          setIsPlaying(false);
          return;
        }
      }
    }
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (!queue.length) return;
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = currentIndex - 1 < 0 ? 0 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
  };

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => handleNext(true);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex, repeatMode, isShuffle]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Giữ trạng thái nút Play/Pause khớp với phần tử audio thật
  // (trình duyệt có thể tự dừng khi đổi tab / chặn autoplay / file lỗi).
  useEffect(() => {
    const audio = audioRef.current;
    const onPause = () => !audio.ended && setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("error", onPause);
    return () => {
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("error", onPause);
    };
  }, []);

  // Đăng xuất / hết phiên (user = null): dừng nhạc hẳn và xóa hàng đợi
  useEffect(() => {
    if (user) return;
    const audio = audioRef.current;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [user]);

  useEffect(() => {
    if (!currentSong) return;
    const audio = audioRef.current;
    audio.src = currentSong.audioUrl;
    setProgress(0);
    if (isPlaying) {
      audio.play().catch(() => {});
      // UC24: ghi nhận 1 lượt nghe khi BẮT ĐẦU phát (không đếm trùng trong 30 giây)
      if (tokenStorage.getToken()) recordPlay(currentSong.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  // Mỗi khi đổi bài, nạp thông tin đầy đủ của bài từ server (video canvasUrl, lượt nghe...) rồi bổ sung
  // vào hàng đợi. Cần vì bài lấy từ bản lưu cũ (vd: danh sách "đã thích") có thể thiếu hoặc lỗi thời video.
  const currentId = currentSong?.id;
  useEffect(() => {
    if (currentId == null) return undefined;
    let cancelled = false;
    getSongById(currentId)
      .then((full) => {
        if (cancelled || !full) return;
        setQueue((q) => q.map((s) => (String(s.id) === String(currentId) ? { ...s, ...full } : s)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  const playQueue = (songs, startIndex = 0) => {
    // Lần đầu bấm phát bài: tự bật panel trên màn hình rộng (điện thoại thì mở bằng nút)
    if (currentIndex < 0 && window.innerWidth > 900) setPanelOpen(true);
    setQueue(songs);
    setCurrentIndex(startIndex);
    setIsPlaying(true);
    requestAnimationFrame(() => audioRef.current.play().catch(() => {}));
  };

  const playSong = (song, songList = null) => {
    if (songList) {
      const idx = songList.findIndex((s) => s.id === song.id);
      playQueue(songList, idx >= 0 ? idx : 0);
    } else {
      playQueue([song], 0);
    }
  };

  // Thêm cuối hàng đợi; chưa có bài nào đang phát thì phát luôn bài này.
  const addToQueue = (song) => {
    if (!song) return;
    if (currentIndex < 0) {
      playQueue([song], 0);
      return;
    }
    setQueue((q) => [...q, song]);
  };

  const togglePlay = () => {
    if (!currentSong) return;
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const value = useMemo(
    () => ({
      queue,
      currentSong,
      currentIndex,
      isPlaying,
      progress,
      duration,
      volume,
      isShuffle,
      repeatMode,
      setVolume,
      setIsShuffle,
      setRepeatMode: () =>
        setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off")),
      panelOpen,
      setPanelOpen,
      addToQueue,
      playSong,
      playQueue,
      togglePlay,
      next: () => handleNext(false),
      prev: handlePrev,
      seek,
    }),
    [queue, currentSong, currentIndex, isPlaying, progress, duration, volume, isShuffle, repeatMode, panelOpen]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer phải được dùng bên trong PlayerProvider");
  return ctx;
};
