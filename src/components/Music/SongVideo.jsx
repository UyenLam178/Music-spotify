import { useEffect, useRef, useState } from "react";
import { getVideo } from "../../services/videoService";

// Video loop của bài hát. `playing` = đúng bài này đang được phát.
// Nhạc phát -> video chạy lặp; nhạc dừng / chuyển bài / hết phiên -> video dừng.
// Video luôn tắt tiếng vì âm thanh lấy từ bài hát.
export default function SongVideo({ songId, playing, className = "" }) {
  const videoRef = useRef(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    getVideo(songId).then((v) => {
      if (cancelled || !v?.blob) return;
      objectUrl = URL.createObjectURL(v.blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl("");
    };
  }, [songId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [playing, url]);

  if (!url) return null;

  return (
    <div className={`song-video ${className}`.trim()}>
      <video ref={videoRef} src={url} muted loop playsInline preload="auto" />
    </div>
  );
}
