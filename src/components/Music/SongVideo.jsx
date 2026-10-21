import { useEffect, useRef } from "react";

// Video loop (Canvas) của bài hát, `src` = đường dẫn video của bài (rỗng thì không hiện gì).
// `playing` = đúng bài này đang được phát.
// Nhạc phát -> video chạy lặp; nhạc dừng / chuyển bài / hết phiên -> video dừng.
// Video luôn tắt tiếng vì âm thanh lấy từ bài hát.
export default function SongVideo({ src, playing, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [playing, src]);

  if (!src) return null;

  return (
    <div className={`song-video ${className}`.trim()}>
      <video key={src} ref={videoRef} src={src} muted loop playsInline preload="auto" />
    </div>
  );
}
