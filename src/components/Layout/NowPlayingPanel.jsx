import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import { useLikes } from "../../context/LikeContext";
import { getLyrics, LYRICS_CHANGED_EVENT } from "../../services/lyricsService";
import { IconHeart, IconInfo, IconMore, IconPlus, IconQueue, IconShare, IconUser, IconX } from "../Common/Icons";
import SongVideo from "../Music/SongVideo";
import LyricsView from "../Music/LyricsView";
import AddToPlaylistModal from "../Playlist/AddToPlaylistModal";
import Modal from "../Common/Modal";

// Độ rộng panel kéo được, nhớ lại cho lần sau
const MIN_W = 280;
const DEFAULT_W = 340;
const WIDTH_KEY = "mw_panel_width";
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const maxWidth = () => Math.max(MIN_W, Math.min(640, Math.round(window.innerWidth * 0.5)));
const readWidth = () => {
  try {
    const n = Number(localStorage.getItem(WIDTH_KEY));
    return n >= MIN_W ? Math.min(n, maxWidth()) : DEFAULT_W;
  } catch {
    return DEFAULT_W;
  }
};
const saveWidth = (w) => {
  try {
    localStorage.setItem(WIDTH_KEY, String(w));
  } catch {
    /* bỏ qua: hết dung lượng / chế độ riêng tư */
  }
};

const fmt = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// Panel "Đang phát" bên phải (giống Spotify):
//   - video loop của bài (nếu có, chạy/dừng theo nhạc) hoặc ảnh bìa
//   - tên bài, nghệ sĩ, nút tim
//   - lời chạy theo nhạc
//   - nút ⋯ ở góc video mở menu tuỳ chọn
export default function NowPlayingPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentSong: song, isPlaying, progress, seek, setPanelOpen, addToQueue } = usePlayer();
  const { isLiked, toggleLike, canLike } = useLikes();

  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const menuRef = useRef(null);
  const toastTimer = useRef(null);
  const [width, setWidth] = useState(readWidth);
  const dragRef = useRef(null);

  // Cột panel của lưới đọc độ rộng từ biến CSS này (xem .app-shell.has-panel)
  useEffect(() => {
    document.documentElement.style.setProperty("--panel-width", `${width}px`);
  }, [width]);

  const onResizeDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, w: width };
    document.body.classList.add("np-resizing");
  };
  const onResizeMove = (e) => {
    const d = dragRef.current;
    if (d) setWidth(clamp(d.w + (d.x - e.clientX), MIN_W, maxWidth())); // kéo sang trái = rộng ra
  };
  const onResizeUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    document.body.classList.remove("np-resizing");
    saveWidth(width);
  };
  const onResizeKey = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = clamp(width + (e.key === "ArrowLeft" ? 16 : -16), MIN_W, maxWidth());
    setWidth(next);
    saveWidth(next);
  };
  const onResizeReset = () => {
    setWidth(DEFAULT_W);
    saveWidth(DEFAULT_W);
  };

  // Nạp lại lời khi artist vừa lưu / sửa mốc thời gian (tránh giữ bản lời cũ trong panel)
  const [lyricsVersion, setLyricsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setLyricsVersion((v) => v + 1);
    window.addEventListener(LYRICS_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump); // lưu từ tab khác
    return () => {
      window.removeEventListener(LYRICS_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lyrics = useMemo(() => getLyrics(song.id), [song.id, lyricsVersion]);
  const liked = isLiked(song.id);

  // Đóng menu khi bấm ra ngoài / nhấn Esc
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  const closeOnMobile = () => {
    if (window.innerWidth <= 900) setPanelOpen(false);
  };

  const run = (fn) => () => {
    setMenuOpen(false);
    fn();
  };

  const onAddToPlaylist = () => (canLike ? setPlaylistOpen(true) : navigate("/login"));
  const onToggleLiked = () => (canLike ? toggleLike(song) : navigate("/login"));
  const onAddToQueue = () => {
    addToQueue(song);
    showToast(t("nowPlaying.queued"));
  };
  const onGoToArtist = () => {
    navigate(`/artist/${song.artistId}`);
    closeOnMobile();
  };
  const onShare = async () => {
    const url = `${window.location.origin}/song/${song.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("nowPlaying.copied"));
    } catch {
      window.prompt(t("nowPlaying.share"), url); // trình duyệt chặn clipboard -> cho copy tay
    }
  };

  return (
    <>
    <div
      className="np-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={t("nowPlaying.resize")}
      title={t("nowPlaying.resize")}
      tabIndex={0}
      onPointerDown={onResizeDown}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeUp}
      onPointerCancel={onResizeUp}
      onKeyDown={onResizeKey}
      onDoubleClick={onResizeReset}
    />
    <aside className="np-panel" aria-label={t("nowPlaying.title")}>
      <div className="np-head">
        <strong>{t("nowPlaying.title")}</strong>
        <button className="btn-icon" onClick={() => setPanelOpen(false)} aria-label={t("common.close")} title={t("common.close")}>
          <IconX />
        </button>
      </div>

      <div className="np-media" ref={menuRef}>
        <img className="np-cover" src={song.coverUrl} alt={song.title} />
        <SongVideo songId={song.id} playing={isPlaying} className="np-video" />

        <button
          className="np-more"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={t("nowPlaying.menu")}
          aria-expanded={menuOpen}
          title={t("nowPlaying.menu")}
        >
          <IconMore />
        </button>

        {menuOpen && (
          <div className="np-menu" role="menu">
            <button role="menuitem" onClick={run(onAddToPlaylist)}>
              <IconPlus /> {t("common.addToPlaylist")}
            </button>
            <button role="menuitem" onClick={run(onToggleLiked)}>
              <IconHeart filled={liked} /> {liked ? t("nowPlaying.removeFromLiked") : t("nowPlaying.addToLiked")}
            </button>
            <button role="menuitem" onClick={run(onAddToQueue)}>
              <IconQueue /> {t("nowPlaying.addToQueue")}
            </button>
            <div className="np-menu-divider" />
            <button role="menuitem" onClick={run(onGoToArtist)}>
              <IconUser /> {t("nowPlaying.goToArtist")}
            </button>
            <button role="menuitem" onClick={run(() => setCreditsOpen(true))}>
              <IconInfo /> {t("nowPlaying.viewCredits")}
            </button>
            <button role="menuitem" onClick={run(onShare)}>
              <IconShare /> {t("nowPlaying.share")}
            </button>
          </div>
        )}
      </div>

      <div className="np-info">
        <div className="np-info-text">
          <Link to={`/song/${song.id}`} className="np-title" onClick={closeOnMobile}>
            {song.title}
          </Link>
          <Link to={`/artist/${song.artistId}`} className="np-artist" onClick={closeOnMobile}>
            {song.artistName}
          </Link>
        </div>
        <button
          className={`btn-icon like-btn${liked ? " liked" : ""}`}
          onClick={onToggleLiked}
          aria-pressed={liked}
          aria-label={liked ? t("common.unlike") : t("common.like")}
        >
          <IconHeart filled={liked} />
        </button>
      </div>

      <section className="np-lyrics">
        <h3>{t("lyrics.title")}</h3>
        {!lyrics ? (
          <p className="sb-hint" style={{ padding: 0 }}>{t("lyrics.empty")}</p>
        ) : (
          <LyricsView lines={lyrics.lines} synced={lyrics.synced} time={progress} onSeek={seek} />
        )}
      </section>

      {toast && <div className="np-toast" role="status">{toast}</div>}

      <AddToPlaylistModal isOpen={playlistOpen} onClose={() => setPlaylistOpen(false)} song={song} />

      <Modal isOpen={creditsOpen} onClose={() => setCreditsOpen(false)} title={t("nowPlaying.credits.title")} width={420}>
        <dl className="np-credits">
          <dt>{t("nowPlaying.credits.song")}</dt>
          <dd>{song.title}</dd>
          <dt>{t("nowPlaying.credits.mainArtist")}</dt>
          <dd>{song.mainArtistName || song.artistName}</dd>
          {song.featuredArtists?.length > 0 && (
            <>
              <dt>{t("nowPlaying.credits.featured")}</dt>
              <dd>{song.featuredArtists.map((a) => a.artistName).join(", ")}</dd>
            </>
          )}
          {song.albumTitle && (
            <>
              <dt>{t("nowPlaying.credits.album")}</dt>
              <dd>{song.albumTitle}</dd>
            </>
          )}
          {song.releaseAt && (
            <>
              <dt>{t("nowPlaying.credits.released")}</dt>
              <dd>{new Date(song.releaseAt).toLocaleDateString()}</dd>
            </>
          )}
          <dt>{t("nowPlaying.credits.duration")}</dt>
          <dd>{fmt(song.duration)}</dd>
          <dt>{t("nowPlaying.credits.plays")}</dt>
          <dd>{(song.playCount ?? 0).toLocaleString()}</dd>
        </dl>
      </Modal>
    </aside>
    </>
  );
}
