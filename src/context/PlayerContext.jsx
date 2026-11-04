import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { tokenStorage } from "../services/api";
import { useAuth } from "./AuthContext";
import { getSongById, recordPlay, getArtistById } from "../services/songService";
import { getSongsByGenres } from "../services/recommendationService";
import { readJson, writeJson } from "../services/storage";

// Lưu âm lượng người dùng đã chỉnh để lần sau vào web vẫn giữ nguyên
const VOLUME_KEY = "player.volume";
const DEFAULT_VOLUME = 0.8;
const loadVolume = () => {
  const v = Number(readJson(VOLUME_KEY, DEFAULT_VOLUME));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
};

const MAX_SAME_ARTIST = 3; // max_same trong recommender.py

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
  const [volume, setVolume] = useState(loadVolume);
  // Âm lượng trước khi tắt tiếng, để bấm nút loa lần nữa thì khôi phục đúng mức cũ
  const lastVolumeRef = useRef(volume > 0 ? volume : DEFAULT_VOLUME);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // off | all | one
  // Panel "Đang phát" bên phải (video + lời + menu ⋯)
  const [panelOpen, setPanelOpen] = useState(false);

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  // Các bài đã phát trong phiên: không phát lại, để tự động phát không quay vòng A -> B -> A -> B
  const playedRef = useRef(new Set());
  const loadingRecRef = useRef(false);
  const artistSongsRef = useRef(new Map()); // artistId -> các bài của nghệ sĩ (chính + feat), cache trong phiên

  const fetchArtistSongs = async (artistId) => {
    const key = String(artistId);
    if (!artistSongsRef.current.has(key)) {
      const artist = await getArtistById(artistId).catch(() => null);
      artistSongsRef.current.set(key, artist?.topSongs || []);
    }
    return artistSongsRef.current.get(key);
  };

  // Khớp recommend_artist_db (recommender.py): sau bài đang nghe chỉ phát tối đa MAX_SAME_ARTIST bài
  // liên quan của cùng nghệ sĩ; quá giới hạn hoặc nghệ sĩ không đủ bài thì sang nghệ sĩ khác cùng thể loại.
  const sameArtistCountRef = useRef(0); // số bài cùng nghệ sĩ đã tự phát nối tiếp kể từ lần người dùng chọn bài / đổi nghệ sĩ

  // Chọn bài tự phát tiếp khi hết hàng đợi, theo thứ tự:
  //  1) bài chưa nghe của CHÍNH nghệ sĩ bài vừa phát (gồm cả bài được feat), tối đa MAX_SAME_ARTIST bài liền nhau,
  //  2) bài chưa nghe CÙNG THỂ LOẠI của nghệ sĩ khác (bài đó là bài đầu của lượt nghệ sĩ mới, lại được tối đa MAX_SAME_ARTIST bài),
  //  3) cả 2 đều không có: nếu nghệ sĩ còn bài chưa nghe thì phát tiếp bài của họ, không thì trả null để dừng.
  const pickNextSong = async (song) => {
    const inQueue = new Set(queue.map((x) => String(x.id)));
    const isFresh = (x) => x && !playedRef.current.has(String(x.id)) && !inQueue.has(String(x.id));
    // recommender.py bốc ngẫu nhiên trong nhóm nhiều lượt nghe nhất => chọn ngẫu nhiên trong 10 bài đầu
    const pickOne = (list) => list[Math.floor(Math.random() * Math.min(list.length, 10))];

    const sameArtistFresh =
      song.artistId != null ? (await fetchArtistSongs(song.artistId)).filter(isFresh) : [];
    if (sameArtistFresh.length && sameArtistCountRef.current < MAX_SAME_ARTIST) {
      sameArtistCountRef.current += 1;
      return pickOne(sameArtistFresh);
    }

    if (song.genreId != null) {
      const others = (await getSongsByGenres([song.genreId], 10)).filter(
        (x) => isFresh(x) && String(x.artistId) !== String(song.artistId)
      );
      if (others.length) {
        sameArtistCountRef.current = 0; // sang nghệ sĩ mới, tính lại từ đầu
        return others[0];
      }
    }

    if (sameArtistFresh.length) return pickOne(sameArtistFresh);
    return null;
  };

  const autoplayNext = async () => {
    if (loadingRecRef.current || !currentSong) return;
    loadingRecRef.current = true;
    try {
      const next = await pickNextSong(currentSong);
      if (!next) {
        setIsPlaying(false);
        return;
      }
      setQueue([...queue, next]);
      setCurrentIndex(queue.length);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      loadingRecRef.current = false;
    }
  };

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
          autoplayNext();
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
    writeJson(VOLUME_KEY, volume);
    if (volume > 0) lastVolumeRef.current = volume;
  }, [volume]);

  const toggleMute = () => setVolume(volume > 0 ? 0 : lastVolumeRef.current);

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
    playedRef.current.add(String(currentSong.id));
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
    sameArtistCountRef.current = 0; // người dùng tự chọn bài: bắt đầu lượt nghệ sĩ mới
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
      toggleMute,
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
