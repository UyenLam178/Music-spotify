import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as artistService from "../../services/artistService";
import * as genreService from "../../services/genreService";
import * as songMeta from "../../services/songMetaService";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import { SongStatus } from "../../utils/enums";
import { formatDate, formatDuration, toApiDateTime, toInputDateTime } from "../../utils/studio";
import Button from "../../components/Common/Button";
import Field from "../../components/Common/Field";
import Loading from "../../components/Common/Loading";
import Modal from "../../components/Common/Modal";
import StatusBanner from "../../components/Common/StatusBanner";
import SongWizard from "../../components/Studio/SongWizard";
import LyricsEditor from "../../components/Studio/LyricsEditor";
import VideoEditor from "../../components/Studio/VideoEditor";
import { getLyrics } from "../../services/lyricsService";

// Nhãn trạng thái của bài: chờ duyệt / đã lên lịch / đã phát hành / bị từ chối / đã ẩn
const songState = (s) => {
  if (s.status === SongStatus.APPROVED) return s.released ? "released" : "scheduled";
  return (s.status || "").toLowerCase();
};

// UC31 - Đổi lịch phát hành
function ScheduleModal({ song, onClose, onSaved }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(toInputDateTime(song.releaseAt));
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  const save = async (releaseAt) => {
    if (releaseAt && new Date(releaseAt) <= new Date()) {
      setStatus({ type: "error", message: t("studio.releaseFuture") });
      return;
    }
    setBusy(true);
    try {
      await artistService.updateRelease(song.id, toApiDateTime(releaseAt));
      onSaved(t("studio.scheduleSaved"));
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t("studio.scheduleTitle")} width={420}>
      <StatusBanner status={status} />
      <Field label={t("studio.releaseLabel")} htmlFor="st-schedule">
        <input id="st-schedule" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        <span className="sb-hint">{t("studio.releaseHint")}</span>
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button variant="outline" onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
        <Button variant="outline" onClick={() => save(null)} disabled={busy}>{t("studio.releaseNow")}</Button>
        <Button onClick={() => save(value)} disabled={busy || !value}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Trang chính
// ---------------------------------------------------------------------------
export default function ArtistStudio() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  const [songs, setSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  // modal: null | { kind: "form" | "schedule" | "delete", song? }
  const [modal, setModal] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const [list, genreList] = await Promise.all([artistService.getMySongs(), genreService.getGenres()]);
      const songList = Array.isArray(list) ? list : [];
      // Cập nhật bản sao mới nhất để bài hát hiện đúng ở trang thể loại sau khi được duyệt
      songMeta.syncArtistSongs(userId, songList);
      if (mounted.current) {
        setSongs(songList);
        setGenres(genreList);
      }
    } catch (err) {
      if (mounted.current) setStatus({ type: "error", message: extractErrorMessage(err, t("studio.loadFailed")) });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [t, userId]);

  useEffect(() => {
    mounted.current = true;
    Promise.resolve().then(load);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const afterSave = async (message) => {
    setModal(null);
    await load();
    setStatus({ type: "success", message });
  };

  const run = async (song, fn, successKey) => {
    setStatus({ type: "", message: "" });
    setBusyId(song.id);
    try {
      await fn();
      setModal(null);
      await load();
      setStatus({ type: "success", message: t(successKey) });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading full />;

  return (
    <div className="admin-page">
      <div className="studio-head">
        <h1 className="playlist-header-title" style={{ fontSize: 40 }}>{t("studio.title")}</h1>
        <Button onClick={() => setModal({ kind: "form", song: null })}>+ {t("studio.addSong")}</Button>
      </div>

      <StatusBanner status={status} />

      {songs.length === 0 ? (
        <p className="sb-hint">{t("studio.empty")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="artist-songs">
            <thead>
              <tr>
                <th>{t("studio.colSong")}</th>
                <th>{t("wizard.colGenre")}</th>
                <th>{t("studio.colStatus")}</th>
                <th>{t("studio.colRelease")}</th>
                <th>{t("studio.colPlays")}</th>
                <th>{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s) => {
                const state = songState(s);
                const busy = busyId === s.id;
                const meta = songMeta.getMeta(s.id);
                const genre = genres.find((g) => String(g.id) === String(meta?.genreId));
                const canSchedule = s.status !== SongStatus.REJECTED && !(s.status === SongStatus.APPROVED && s.released);
                return (
                  <tr key={s.id} data-song={s.title}>
                    <td>
                      <div className="studio-song">
                        <div className="studio-cover">
                          {s.coverUrl ? <img src={resolveAssetUrl(s.coverUrl)} alt="" /> : <span>♪</span>}
                        </div>
                        <div>
                          <strong>{s.title}</strong>
                          <div className="sb-hint">
                            {formatDuration(s.durationSeconds)}
                            {s.featuredArtists?.length > 0 &&
                              ` · feat. ${s.featuredArtists.map((a) => a.artistName).join(", ")}`}
                          </div>
                          {meta?.albumTitle && <div className="sb-hint">♫ {meta.albumTitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {genre ? (
                        <span className="genre-pill">
                          <i className="genre-dot" style={{ background: `#${genre.color}` }} />
                          {genre.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className={`status-pill song-${state}`}>{t(`studio.state.${state}`, state)}</span>
                      {s.status === SongStatus.REJECTED && s.rejectReason && (
                        <div className="sb-hint" style={{ maxWidth: 240 }}>
                          {t("studio.rejectReason")}: {s.rejectReason}
                        </div>
                      )}
                    </td>
                    <td>{s.releaseAt ? formatDate(s.releaseAt) : "—"}</td>
                    <td>{s.playCount ?? 0}</td>
                    <td>
                      <div className="studio-actions">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setModal({ kind: "form", song: s })}>
                          {t("common.edit")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy || !s.audioUrl} onClick={() => setModal({ kind: "lyrics", song: s })}>
                          {getLyrics(s.id) ? t("lyrics.editor.editBtn") : t("lyrics.editor.addBtn")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy || !s.audioUrl} onClick={() => setModal({ kind: "video", song: s })}>
                          {t("songVideo.btn")}
                        </Button>
                        {canSchedule && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => setModal({ kind: "schedule", song: s })}>
                            {t("studio.schedule")}
                          </Button>
                        )}
                        {s.status === SongStatus.APPROVED && (
                          <Button size="sm" variant="outline" isLoading={busy} onClick={() => run(s, () => artistService.hideSong(s.id), "studio.hidden")}>
                            {t("studio.hide")}
                          </Button>
                        )}
                        {s.status === SongStatus.HIDDEN && (
                          <Button size="sm" variant="outline" isLoading={busy} onClick={() => run(s, () => artistService.showSong(s.id), "studio.shown")}>
                            {t("studio.show")}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setModal({ kind: "delete", song: s })}>
                          {t("studio.delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal?.kind === "form" && (
        <SongWizard song={modal.song} onClose={() => setModal(null)} onSaved={afterSave} />
      )}
      {modal?.kind === "lyrics" && (
        <LyricsEditor song={modal.song} onClose={() => setModal(null)} onSaved={afterSave} />
      )}
      {modal?.kind === "video" && (
        <VideoEditor song={modal.song} onClose={() => setModal(null)} onSaved={afterSave} />
      )}
      {modal?.kind === "schedule" && (
        <ScheduleModal song={modal.song} onClose={() => setModal(null)} onSaved={afterSave} />
      )}
      {modal?.kind === "delete" && (
        <Modal isOpen onClose={() => setModal(null)} title={t("studio.confirmDeleteTitle")}>
          <p style={{ marginBottom: 20 }}>{t("studio.confirmDelete", { title: modal.song.title })}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setModal(null)}>{t("common.cancel")}</Button>
            <Button
              isLoading={busyId === modal.song.id}
              onClick={() => run(modal.song, () => artistService.deleteSong(modal.song.id), "studio.deleted")}
            >
              {t("studio.delete")}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
