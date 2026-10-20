import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../../services/api";
import {
  deleteLyrics,
  getLyrics,
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
  const existing = useMemo(() => getLyrics(song.id), [song.id]);
  const [step, setStep] = useState(existing ? 2 : 1);
  const [raw, setRaw] = useState(existing ? toLrc(existing.lines) : "");
  const [lines, setLines] = useState(existing ? existing.lines : []);
  const [pointer, setPointer] = useState(() => {
    if (!existing) return 0;
    const i = existing.lines.findIndex((l) => l.time == null);
    return i < 0 ? existing.lines.length : i;
  });
  const [status, setStatus] = useState({ type: "", message: "" });
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

  const save = () => {
    const withTime = lines.filter((l) => l.time != null);
    for (let i = 1; i < withTime.length; i += 1) {
      if (withTime[i].time < withTime[i - 1].time) {
        setStatus({ type: "error", message: t("lyrics.editor.orderError") });
        return;
      }
    }
    saveLyrics(song.id, lines);
    onSaved(isSynced(lines) ? t("lyrics.editor.savedSynced") : t("lyrics.editor.savedPlain"));
  };

  const remove = () => {
    deleteLyrics(song.id);
    onSaved(t("lyrics.editor.deleted"));
  };

  return (
    <Modal isOpen onClose={onClose} title={`${t("lyrics.editor.title")} — ${song.title}`} width={720}>
      <StatusBanner status={status} />

      {step === 1 && (
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
              <Button variant="outline" onClick={remove}>{t("lyrics.editor.delete")}</Button>
            )}
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={goSync}>{t("lyrics.editor.next")}</Button>
          </div>
        </>
      )}

      {step === 2 && (
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
            <Button onClick={save}>{t("common.save")}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
