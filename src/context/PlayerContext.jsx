import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // off | all | one

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

  useEffect(() => {
    if (!currentSong) return;
    const audio = audioRef.current;
    audio.src = currentSong.audioUrl;
    setProgress(0);
    if (isPlaying) audio.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  const playQueue = (songs, startIndex = 0) => {
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
      playSong,
      playQueue,
      togglePlay,
      next: () => handleNext(false),
      prev: handlePrev,
      seek,
    }),
    [queue, currentSong, currentIndex, isPlaying, progress, duration, volume, isShuffle, repeatMode]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer phải được dùng bên trong PlayerProvider");
  return ctx;
};
