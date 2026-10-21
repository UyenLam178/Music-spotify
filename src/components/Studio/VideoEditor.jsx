import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  VIDEO_MAX_SECONDS,
  VIDEO_MIN_SECONDS,
  VIDEO_MAX_BYTES,
  deleteVideo,
  getVideo,
  saveVideo,
  trimVideo,
  validateVideoFile,
} from "../../services/videoService";
import Button from "../Common/Button";
import Modal from "../Common/Modal";
import StatusBanner from "../Common/StatusBanner";
import VideoTrimmer from "./VideoTrimmer";

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

// Nghệ sĩ gắn 1 video ngắn (7–10 giây, tối đa 50MB) cho bài hát đã đăng.
// Video dài hơn 10 giây -> hiện thanh cắt để tự chọn đoạn muốn lấy.
// Video tự lặp lại khi bài hát đang phát và dừng khi nhạc dừng (xem SongVideo).
export default function VideoEditor({ song, onClose, onSaved }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [current, setCurrent] = useState(null); // video đã lưu trước đó
  const [picked, setPicked] = useState(null); // { file, duration } đã hợp lệ, chờ bấm Lưu
  const [source, setSource] = useState(null); // video dài quá 10s đang chờ cắt: { file, duration }
  const [range, setRange] = useState({ start: 0, end: VIDEO_MAX_SECONDS });
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    let cancelled = false;
    getVideo(song.id).then((v) => {
      if (cancelled) return;
      setCurrent(v);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [song.id]);

  // Xem trước: video vừa chọn/cắt, nếu chưa có thì video đang lưu
  useEffect(() => {
    const blob = picked?.file || current?.blob;
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked, current]);

  const showError = (err) => {
    const limits = { min: VIDEO_MIN_SECONDS, max: VIDEO_MAX_SECONDS, size: mb(VIDEO_MAX_BYTES) };
    const known = ["type", "size", "unreadable", "duration", "trimUnsupported"];
    const key = known.includes(err.code) ? err.code : "unreadable";
    setStatus({
      type: "error",
      message: t(`songVideo.error.${key}`, { ...limits, actual: err.duration ? err.duration.toFixed(1) : "" }),
    });
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại đúng file đó
    if (!file) return;
    setStatus({ type: "", message: "" });
    setPicked(null);
    setSource(null);
    try {
      const { duration } = await validateVideoFile(file);
      setPicked({ file, duration });
    } catch (err) {
      // Video dài quá 10s (file ≤ 50MB vì validate kiểm tra dung lượng trước) -> cho tự chọn đoạn cắt
      if (err.code === "duration" && err.duration > VIDEO_MAX_SECONDS) {
        setSource({ file, duration: err.duration });
        setRange({ start: 0, end: VIDEO_MAX_SECONDS });
        return;
      }
      showError(err);
    }
  };

  const cut = async () => {
    const length = range.end - range.start;
    setBusy(true);
    setProgress(0);
    setStatus({ type: "", message: "" });
    try {
      const trimmed = await trimVideo(source.file, range.start, length, setProgress);
      if (trimmed.size > VIDEO_MAX_BYTES) throw Object.assign(new Error("size"), { code: "size" });
      // webm từ MediaRecorder thường không có metadata độ dài => gán thẳng độ dài đã cắt
      setPicked({ file: trimmed, duration: Math.round(length * 10) / 10 });
      setSource(null);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await saveVideo(song.id, picked.file, picked.duration);
      onSaved(t("songVideo.saved"));
    } catch {
      setStatus({ type: "error", message: t("songVideo.error.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteVideo(song.id);
      onSaved(t("songVideo.removed"));
    } catch {
      setStatus({ type: "error", message: t("songVideo.error.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  const info = picked
    ? `${picked.file.name} · ${mb(picked.file.size)} MB · ${picked.duration.toFixed(1)}s`
    : current
      ? `${current.name} · ${mb(current.size)} MB · ${Number(current.duration).toFixed(1)}s`
      : "";

  return (
    <Modal isOpen onClose={onClose} title={t("songVideo.title", { title: song.title })} width={560}>
      <StatusBanner status={status} />
      <p className="sb-hint" style={{ padding: 0, marginBottom: 12 }}>
        {t("songVideo.rules", { min: VIDEO_MIN_SECONDS, max: VIDEO_MAX_SECONDS, size: mb(VIDEO_MAX_BYTES) })}
      </p>

      <input ref={inputRef} type="file" accept="video/*" hidden onChange={onPick} />

      {source ? (
        <>
          <p style={{ fontSize: 14, marginBottom: 10 }}>
            {t("songVideo.trim.intro", {
              actual: source.duration.toFixed(1),
              min: VIDEO_MIN_SECONDS,
              max: VIDEO_MAX_SECONDS,
            })}
          </p>
          <VideoTrimmer file={source.file} duration={source.duration} value={range} onChange={setRange} disabled={busy} />
          {busy && (
            <div className="trimmer-progress" role="status">
              <div className="trimmer-progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
              <span>{t("songVideo.trim.progress", { percent: Math.round(progress * 100) })}</span>
            </div>
          )}
          <div className="video-editor-actions">
            <Button variant="outline" onClick={() => setSource(null)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
              {t("songVideo.choose")}
            </Button>
            <Button onClick={cut} isLoading={busy}>
              {t("songVideo.trim.confirm")}
            </Button>
          </div>
        </>
      ) : (
        <>
          {(picked?.file || current?.blob) && previewUrl ? (
            <video className="video-editor-preview" src={previewUrl} muted loop autoPlay playsInline controls />
          ) : (
            !loading && <div className="video-editor-empty">{t("songVideo.none")}</div>
          )}
          {info && <p className="sb-hint" style={{ padding: 0, margin: "8px 0 0" }}>{info}</p>}

          <div className="video-editor-actions">
            {current && !picked && (
              <Button variant="outline" onClick={remove} disabled={busy}>
                {t("songVideo.remove")}
              </Button>
            )}
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy || loading}>
              {current || picked ? t("songVideo.choose") : t("songVideo.chooseFirst")}
            </Button>
            <Button onClick={save} isLoading={busy} disabled={!picked}>
              {t("common.save")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
