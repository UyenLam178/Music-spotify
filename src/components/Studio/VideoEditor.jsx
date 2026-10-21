import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import {
  VIDEO_MAX_SECONDS,
  VIDEO_MIN_SECONDS,
  VIDEO_MAX_BYTES,
  deleteVideo,
  saveVideo,
  validateVideoFile,
} from "../../services/videoService";
import Button from "../Common/Button";
import Modal from "../Common/Modal";
import StatusBanner from "../Common/StatusBanner";

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

// Nghệ sĩ gắn 1 video ngắn (MP4, 7–10 giây, tối đa 50MB) cho bài hát đã đăng.
// Video được gắn với bài hát nên mọi người nghe đều thấy.
// Video tự lặp lại khi bài hát đang phát và dừng khi nhạc dừng (xem SongVideo).
export default function VideoEditor({ song, onClose, onSaved }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const currentUrl = song.canvasUrl ? resolveAssetUrl(song.canvasUrl) : ""; // video đã có của bài
  const [picked, setPicked] = useState(null); // { file, duration } đã hợp lệ, chờ bấm Lưu
  const [pickedUrl, setPickedUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  // Xem trước video vừa chọn (chưa lưu)
  useEffect(() => {
    if (!picked) {
      setPickedUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(picked.file);
    setPickedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  const showError = (err) => {
    const limits = { min: VIDEO_MIN_SECONDS, max: VIDEO_MAX_SECONDS, size: mb(VIDEO_MAX_BYTES) };
    const known = ["type", "size", "unreadable", "duration"];
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
    try {
      const { duration } = await validateVideoFile(file);
      setPicked({ file, duration });
    } catch (err) {
      showError(err);
    }
  };

  const save = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await saveVideo(song.id, picked.file);
      onSaved(t("songVideo.saved"));
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err, t("songVideo.error.saveFailed")) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteVideo(song.id);
      onSaved(t("songVideo.removed"));
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err, t("songVideo.error.saveFailed")) });
    } finally {
      setBusy(false);
    }
  };

  const previewUrl = pickedUrl || currentUrl;
  const info = picked ? `${picked.file.name} · ${mb(picked.file.size)} MB · ${picked.duration.toFixed(1)}s` : "";

  return (
    <Modal isOpen onClose={onClose} title={t("songVideo.title", { title: song.title })} width={560}>
      <StatusBanner status={status} />
      <p className="sb-hint" style={{ padding: 0, marginBottom: 12 }}>
        {t("songVideo.rules", { min: VIDEO_MIN_SECONDS, max: VIDEO_MAX_SECONDS, size: mb(VIDEO_MAX_BYTES) })}
      </p>

      <input ref={inputRef} type="file" accept="video/mp4" hidden onChange={onPick} />

      {previewUrl ? (
        <video key={previewUrl} className="video-editor-preview" src={previewUrl} muted loop autoPlay playsInline controls />
      ) : (
        <div className="video-editor-empty">{t("songVideo.none")}</div>
      )}
      {info && <p className="sb-hint" style={{ padding: 0, margin: "8px 0 0" }}>{info}</p>}

      <div className="video-editor-actions">
        {currentUrl && !picked && (
          <Button variant="outline" onClick={remove} disabled={busy}>
            {t("songVideo.remove")}
          </Button>
        )}
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {currentUrl || picked ? t("songVideo.choose") : t("songVideo.chooseFirst")}
        </Button>
        <Button onClick={save} isLoading={busy} disabled={!picked}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}
