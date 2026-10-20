import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { activeLineIndex } from "../../services/lyricsService";

// Hiển thị lời bài hát.
//  - synced  : tự cuộn tới dòng đang hát, dòng hiện tại phát sáng, bấm vào dòng để tua tới đó
//  - !synced : hiển thị lời tĩnh (artist chưa gắn mốc thời gian)
// `time` = thời gian đang phát (giây) hoặc null nếu bài này chưa được phát.
const LEAD = 0.15; // sáng sớm hơn chút cho khớp cảm giác nghe

export default function LyricsView({ lines, synced, time = null, onSeek, className = "" }) {
  const { t } = useTranslation();
  const boxRef = useRef(null);
  const lineRefs = useRef([]);
  const lastUserScroll = useRef(0);

  const active = useMemo(
    () => (synced && time != null ? activeLineIndex(lines, time + LEAD) : -1),
    [synced, lines, time]
  );

  // Tự cuộn dòng đang hát về giữa khung (trừ khi người dùng vừa tự cuộn)
  useEffect(() => {
    if (active < 0) return;
    if (Date.now() - lastUserScroll.current < 2500) return;
    const box = boxRef.current;
    const el = lineRefs.current[active];
    if (!box || !el) return;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [active]);

  const markUserScroll = () => {
    lastUserScroll.current = Date.now();
  };

  return (
    <div
      ref={boxRef}
      className={`lyrics-box ${synced ? "synced" : "plain"} ${className}`}
      onWheel={markUserScroll}
      onTouchMove={markUserScroll}
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
            onClick={clickable ? () => onSeek(line.time) : undefined}
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
