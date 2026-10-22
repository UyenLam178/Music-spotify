import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import {
  deleteLyrics,
  getMyLyrics,
  isSynced,
  parseLyricsText,
  saveLyrics,
  toLrc,
} from "../../services/lyricsService";
import Button from "../Common/Button";
import Modal from "../Common/Modal";
import StatusBanner from "../Common/StatusBanner";

const fmt = (sec) => {
  if (sec == null) return "--:--.-";
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(1).padStart(4, "0")}`;
};

// Nghệ sĩ nhập lời + gắn mốc thời gian (giống tool tạo lyrics của YouTube / LRC):
//   Bước 1 — dán lời (thuần, mỗi dòng 1 câu, hoặc định dạng LRC có sẵn [mm:ss.xx])
//   Bước 2 — nghe nhạc, tới câu nào thì bấm "Gắn mốc" (hoặc phím Space) để ghi lại thời điểm
export default function LyricsEditor({ song, onClose, onSaved }) {
  const { t } = useTranslation();
  // Lời đã lưu trên backend; nạp khi mở hộp thoại
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [raw, setRaw] = useState("");
  const [lines, setLines] = useState([]);
  const [pointer, setPointer] = useState(0);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    let cancelled = false;
    getMyLyrics(song.id)
      .then((data) => {
        if (cancelled || !data) return;
        setExisting(data);
        setRaw(toLrc(data.lines));
        setLines(data.lines);
        const i = data.lines.findIndex((l) => l.time == null);
        setPointer(i < 0 ? data.lines.length : i);
        setStep(2);
      })
      .catch((err) => !cancelled && setStatus({ type: "error", message: extractErrorMessage(err) }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [song.id]);
  const audioRef = useRef(null);
  const listRef = useRef(null);

  const goSync = () => {
    const parsed = parseLyricsText(raw);
    if (!parsed.length) {
      setStatus({ type: "error", message: t("lyrics.editor.needText") });
      return;
    }
    setStatus({ type: "", message: "" });
    setLines(parsed);
    const i = parsed.findIndex((l) => l.time == null);
    setPointer(i < 0 ? parsed.length : i);
    setStep(2);
  };

  const stamp = () => {
    const audio = audioRef.current;
    if (!audio || pointer >= lines.length) return;
    const time = Math.round(audio.currentTime * 10) / 10;
    setLines((ls) => ls.map((l, i) => (i === pointer ? { ...l, time } : l)));
    setPointer((p) => p + 1);
  };

  const undo = () => {
    if (pointer <= 0) return;
    const prev = pointer - 1;
    setLines((ls) => ls.map((l, i) => (i === prev ? { ...l, time: null } : l)));
    setPointer(prev);
    // tua về đầu dòng vừa gỡ để gắn lại cho dễ
    const back = lines[prev]?.time;
    if (back != null && audioRef.current) audioRef.current.currentTime = Math.max(0, back - 2);
  };

  const setTime = (i, value) => {
    const n = value === "" ? null : Math.max(0, Number(value));
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, time: Number.isFinite(n) ? n : null } : l)));
  };

  // Phím Space = gắn mốc (không bắt khi đang gõ trong ô nhập / bấm nút)
  useEffect(() => {
    if (step !== 2) return undefined;
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "AUDIO") return;
      e.preventDefault();
      stamp();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // Giữ dòng đang chờ gắn mốc nằm trong tầm nhìn
  useEffect(() => {
    const el = listRef.current?.children[pointer];
    if (el && listRef.current) {
      listRef.current.scrollTo({ top: el.offsetTop - listRef.current.clientHeight / 2, behavior: "smooth" });
    }
  }, [pointer]);

  const stamped = lines.filter((l) => l.time != null).length;

  const save = async () => {
    const withTime = lines.filter((l) => l.time != null);
    for (let i = 1; i < withTime.length; i += 1) {
      if (withTime[i].time < withTime[i - 1].time) {
        setStatus({ type: "error", message: t("lyrics.editor.orderError") });
        return;
      }
    }
    setSaving(true);
    try {
      await saveLyrics(song.id, lines);
      onSaved(isSynced(lines) ? t("lyrics.editor.savedSynced") : t("lyrics.editor.savedPlain"));
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await deleteLyrics(song.id);
      onSaved(t("lyrics.editor.deleted"));
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`${t("lyrics.editor.title")} — ${song.title}`} width={720}>
      <StatusBanner status={status} />

      {loading && <p className="sb-hint">{t("common.loading", { defaultValue: "..." })}</p>}

      {!loading && step === 1 && (
        <>
          <p className="sb-hint" style={{ marginBottom: 8 }}>{t("lyrics.editor.pasteHint")}</p>
          <textarea
            className="lyrics-textarea"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t("lyrics.editor.placeholder")}
            rows={14}
          />
          <div className="lyrics-editor-actions">
            {existing && (
              <Button variant="outline" onClick={remove} isLoading={saving}>{t("lyrics.editor.delete")}</Button>
            )}
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={goSync}>{t("lyrics.editor.next")}</Button>
          </div>
        </>
      )}

      {!loading && step === 2 && (
        <>
          <p className="sb-hint" style={{ marginBottom: 8 }}>{t("lyrics.editor.syncHint")}</p>
          <audio ref={audioRef} src={resolveAssetUrl(song.audioUrl)} controls className="lyrics-audio" />

          <div className="lyrics-stamp-bar">
            <Button onClick={stamp} disabled={pointer >= lines.length}>
              ⏱ {t("lyrics.editor.stamp")} (Space)
            </Button>
            <Button variant="outline" onClick={undo} disabled={pointer <= 0}>
              ↶ {t("lyrics.editor.undo")}
            </Button>
            <span className="sb-hint">
              {stamped}/{lines.length} {t("lyrics.editor.stamped")}
            </span>
          </div>

          <div className="lyrics-sync-list" ref={listRef}>
            {lines.map((l, i) => (
              <div
                key={i}
                className={`lyrics-sync-row${i === pointer ? " pointer" : ""}${l.time != null ? " done" : ""}`}
                onClick={() => setPointer(i)}
              >
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="lyrics-time-input"
                  value={l.time == null ? "" : l.time}
                  placeholder={fmt(null)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTime(i, e.target.value)}
                  title={fmt(l.time)}
                />
                <span className="lyrics-sync-text">{l.text}</span>
                <button
                  type="button"
                  className="btn-icon lyrics-jump"
                  title={t("lyrics.editor.jump")}
                  disabled={l.time == null}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (audioRef.current && l.time != null) {
                      audioRef.current.currentTime = Math.max(0, l.time - 1);
                      audioRef.current.play().catch(() => {});
                    }
                  }}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>

          <div className="lyrics-editor-actions">
            <Button variant="outline" onClick={() => { setRaw(toLrc(lines)); setStep(1); }}>
              {t("lyrics.editor.back")}
            </Button>
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={save} isLoading={saving}>{t("common.save")}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
