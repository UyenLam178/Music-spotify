import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { activeLineIndex } from "../../services/lyricsService";

// Hiển thị lời bài hát.
//  - synced  : luôn giữ dòng đang hát ở giữa khung, dòng hiện tại sáng rõ, bấm vào dòng để tua tới đó
//  - !synced : hiển thị lời tĩnh (artist chưa gắn mốc thời gian)
// `time` = thời gian đang phát (giây) hoặc null nếu bài này chưa được phát.
const LEAD = 0.15; // sáng sớm hơn chút cho khớp cảm giác nghe
const RESUME_MS = 2500; // người dùng tự cuộn xong thì sau ngần này ms lời tự quay lại dòng đang hát

export default function LyricsView({ lines, synced, time = null, onSeek, className = "" }) {
  const { t } = useTranslation();
  const boxRef = useRef(null);
  const lineRefs = useRef([]);
  const resumeTimer = useRef(null);
  const userScrolling = useRef(false);

  const active = useMemo(
    () => (synced && time != null ? activeLineIndex(lines, time + LEAD) : -1),
    [synced, lines, time]
  );
  const activeRef = useRef(active);
  activeRef.current = active;

  // Đưa dòng `i` về giữa khung. Tính bằng getBoundingClientRect nên không phụ thuộc
  // việc ancestor nào đang `position: relative` (offsetTop thì có -> bị lệch, lời nhảy lung tung).
  const scrollToLine = (i, behavior = "smooth") => {
    const box = boxRef.current;
    const el = lineRefs.current[i];
    if (!box || !el) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const top = box.scrollTop + (r.top - b.top) - box.clientHeight / 2 + r.height / 2;
    box.scrollTo({ top: Math.max(0, top), behavior });
  };

  // Dòng đang hát đổi -> cuộn theo (trừ khi người dùng đang tự cuộn xem chỗ khác)
  useEffect(() => {
    if (active < 0 || userScrolling.current) return;
    scrollToLine(active);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đổi bài / nạp lại lời -> về đúng chỗ đang phát ngay lập tức (không trượt từ vị trí của bài cũ)
  useEffect(() => {
    userScrolling.current = false;
    clearTimeout(resumeTimer.current);
    if (activeRef.current >= 0) scrollToLine(activeRef.current, "auto");
    else if (boxRef.current) boxRef.current.scrollTop = 0;
  }, [lines]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  // Người dùng tự cuộn: tạm dừng bám theo, hết RESUME_MS thì tự quay lại dòng đang hát
  const markUserScroll = () => {
    userScrolling.current = true;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      userScrolling.current = false;
      if (activeRef.current >= 0) scrollToLine(activeRef.current);
    }, RESUME_MS);
  };

  const seekTo = (time) => {
    userScrolling.current = false; // bấm tua thì bám theo ngay
    clearTimeout(resumeTimer.current);
    onSeek(time);
  };

  return (
    <div
      ref={boxRef}
      className={`lyrics-box ${synced ? "synced" : "plain"} ${className}`}
      onWheel={markUserScroll}
      onTouchMove={markUserScroll}
      onPointerDown={markUserScroll}
    >
      {synced && <div className="lyrics-pad" />}
      {lines.map((line, i) => {
        const state = !synced ? "" : i === active ? " active" : i < active ? " past" : "";
        const clickable = synced && onSeek;
        return (
          <p
            key={i}
            ref={(el) => (lineRefs.current[i] = el)}
            className={`lyrics-line${state}${clickable ? " clickable" : ""}`}
            onClick={clickable ? () => seekTo(line.time) : undefined}
            title={clickable ? t("lyrics.clickToSeek") : undefined}
          >
            {line.text}
          </p>
        );
      })}
      {synced && <div className="lyrics-pad" />}
    </div>
  );
}
