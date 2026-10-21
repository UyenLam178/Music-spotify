import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS } from "../../services/videoService";

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(1).padStart(4, "0")}`;
};

// Chọn đoạn cắt trực tiếp trên video dài:
//   - kéo 2 tay nắm (trái/phải) để chỉnh điểm đầu / điểm cuối
//   - kéo phần giữa để dời cả đoạn
//   - đoạn luôn dài từ 7 đến 10 giây
// Video xem trước tự lặp trong đúng đoạn đang chọn.
export default function VideoTrimmer({ file, duration, value, onChange, disabled = false }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const rangeRef = useRef(value);
  const [src, setSrc] = useState("");
  const [time, setTime] = useState(0);

  useEffect(() => {
    rangeRef.current = value;
  }, [value]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Xem trước lặp trong đoạn [start, end]
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return undefined;
    const onTime = () => {
      const { start, end } = rangeRef.current;
      if (v.currentTime >= end || v.currentTime < start - 0.5) v.currentTime = start;
      setTime(v.currentTime);
    };
    const onReady = () => {
      v.currentTime = rangeRef.current.start;
      v.play().catch(() => {});
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onReady);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onReady);
    };
  }, [src]);

  // Tính đoạn mới theo kiểu kéo, luôn giữ độ dài 7–10s và nằm trong video
  const compute = (mode, orig, delta) => {
    const len = orig.end - orig.start;
    if (mode === "move") {
      const start = clamp(orig.start + delta, 0, duration - len);
      return { start, end: start + len };
    }
    if (mode === "start") {
      const start = clamp(orig.start + delta, Math.max(0, orig.end - VIDEO_MAX_SECONDS), orig.end - VIDEO_MIN_SECONDS);
      return { start, end: orig.end };
    }
    const end = clamp(orig.end + delta, orig.start + VIDEO_MIN_SECONDS, Math.min(duration, orig.start + VIDEO_MAX_SECONDS));
    return { start: orig.start, end };
  };

  const apply = (mode, next) => {
    onChange(next);
    const v = videoRef.current;
    if (v) v.currentTime = mode === "end" ? Math.max(next.start, next.end - 1) : next.start;
  };

  const onPointerDown = (mode) => (e) => {
    if (disabled) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, x: e.clientX, orig: rangeRef.current };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    const track = trackRef.current;
    if (!d || !track) return;
    const delta = ((e.clientX - d.x) / track.clientWidth) * duration;
    apply(d.mode, compute(d.mode, d.orig, delta));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onKeyDown = (mode) => (e) => {
    if (disabled || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const step = (e.shiftKey ? 1 : 0.1) * (e.key === "ArrowLeft" ? -1 : 1);
    apply(mode, compute(mode, rangeRef.current, step));
  };

  const pct = (sec) => `${(sec / duration) * 100}%`;
  const length = value.end - value.start;
  const playhead = clamp(time, 0, duration);

  return (
    <div className="trimmer">
      <video ref={videoRef} src={src} className="trimmer-video" muted playsInline loop={false} />

      <div className="trimmer-track" ref={trackRef}>
        <div className="trimmer-dim" style={{ left: 0, width: pct(value.start) }} />
        <div className="trimmer-dim" style={{ left: pct(value.end), right: 0 }} />
        <div
          className="trimmer-window"
          style={{ left: pct(value.start), width: pct(length) }}
          onPointerDown={onPointerDown("move")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span
            className="trimmer-handle left"
            role="slider"
            tabIndex={0}
            aria-label={t("songVideo.trim.start")}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={value.start}
            onPointerDown={onPointerDown("start")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown("start")}
          />
          <span
            className="trimmer-handle right"
            role="slider"
            tabIndex={0}
            aria-label={t("songVideo.trim.end")}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={value.end}
            onPointerDown={onPointerDown("end")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown("end")}
          />
        </div>
        <div className="trimmer-playhead" style={{ left: pct(playhead) }} />
      </div>

      <div className="trimmer-times">
        <span>{t("songVideo.trim.start")}: <b>{fmt(value.start)}</b></span>
        <span>{t("songVideo.trim.end")}: <b>{fmt(value.end)}</b></span>
        <span>{t("songVideo.trim.length")}: <b>{length.toFixed(1)}s</b></span>
        <span className="sb-hint" style={{ padding: 0 }}>/ {fmt(duration)}</span>
      </div>
    </div>
  );
}
