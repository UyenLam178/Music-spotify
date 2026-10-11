import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as artistService from "../../services/artistService";
import * as songService from "../../services/songService";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import { SongStatus } from "../../utils/enums";
import Button from "../../components/Common/Button";
import Field from "../../components/Common/Field";
import Loading from "../../components/Common/Loading";
import Modal from "../../components/Common/Modal";
import StatusBanner from "../../components/Common/StatusBanner";

const MAX_FEAT = 5;
const MAX_TITLE = 150;
const MAX_IMAGE = 2 * 1024 * 1024;
const MAX_MP3 = 20 * 1024 * 1024;
const MAX_WAV = 100 * 1024 * 1024;

const formatDuration = (sec = 0) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

// Backend dùng giờ địa phương không kèm múi giờ ("2026-12-24T20:00:00")
const toApiDateTime = (v) => (v ? (v.length === 16 ? `${v}:00` : v) : null);
const toInputDateTime = (v) => (v ? v.slice(0, 16) : "");
const formatDate = (v) => (v ? new Date(v).toLocaleString() : "");

// Nhãn trạng thái theo SongManageResponse (xem chú thích trong DTO backend)
const songState = (s) => {
  if (s.status === SongStatus.APPROVED) return s.released ? "released" : "scheduled";
  return (s.status || "").toLowerCase();
};

// ---------------------------------------------------------------------------
// Ô chọn nghệ sĩ feat (UC37)
// ---------------------------------------------------------------------------
function FeaturedPicker({ value, onChange }) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = keyword.trim();
    if (!q) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const list = await artistService.searchArtists(q);
        if (!cancelled) setResults(list);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword]);

  const visible = keyword.trim() ? results.filter((a) => !value.some((v) => v.id === a.id)) : [];
  const full = value.length >= MAX_FEAT;

  return (
    <div>
      {value.length > 0 && (
        <div className="studio-chips">
          {value.map((a) => (
            <span key={a.id} className="studio-chip">
              {a.artistName}
              <button
                type="button"
                aria-label={t("studio.removeFeat")}
                onClick={() => onChange(value.filter((v) => v.id !== a.id))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={keyword}
        disabled={full}
        placeholder={full ? t("studio.featMax", { max: MAX_FEAT }) : t("studio.featSearch")}
        onChange={(e) => setKeyword(e.target.value)}
      />
      {visible.length > 0 && (
        <ul className="studio-suggest">
          {visible.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, a]);
                  setKeyword("");
                  setResults([]);
                }}
              >
                {a.artistName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal thêm nhạc (UC26) / sửa bài (UC29 + UC30)
// song = null → thêm mới
// ---------------------------------------------------------------------------
function SongFormModal({ song, genres, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = !!song;
  const [title, setTitle] = useState(song?.title || "");
  const [feat, setFeat] = useState(song?.featuredArtists || []);
  const [genreId, setGenreId] = useState(song ? artistService.getSongGenre(song) : "");
  const [audio, setAudio] = useState(null);
  const [cover, setCover] = useState(null);
  const [releaseAt, setReleaseAt] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = t("studio.titleRequired");
    else if (title.trim().length > MAX_TITLE) errs.title = t("studio.titleLength", { max: MAX_TITLE });

    if (!editing) {
      if (!audio) errs.audio = t("studio.audioRequired");
      else {
        const name = audio.name.toLowerCase();
        if (!name.endsWith(".mp3") && !name.endsWith(".wav")) errs.audio = t("studio.audioType");
        else if (audio.size > (name.endsWith(".mp3") ? MAX_MP3 : MAX_WAV))
          errs.audio = t(name.endsWith(".mp3") ? "studio.mp3Size" : "studio.wavSize");
      }
      if (releaseAt && new Date(releaseAt) <= new Date()) errs.releaseAt = t("studio.releaseFuture");
    }
    if (cover) {
      if (!/^image\//.test(cover.type)) errs.cover = t("studio.coverType");
      else if (cover.size > MAX_IMAGE) errs.cover = t("studio.coverSize");
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const featuredArtistIds = feat.map((a) => a.id);
      if (editing) {
        await artistService.updateSong(song.id, { title: title.trim(), featuredArtistIds, genreId });
        artistService.setSongGenre(song.id, genreId);
        if (cover) await artistService.updateCover(song.id, cover);
      } else {
        const created = await artistService.uploadSong({
          title: title.trim(),
          audio,
          cover,
          featuredArtistIds,
          releaseAt: toApiDateTime(releaseAt),
          genreId,
        });
        if (created?.id) artistService.setSongGenre(created.id, genreId);
      }
      onSaved(t(editing ? "studio.updated" : "studio.uploaded"));
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={editing ? t("studio.editSong") : t("studio.addSong")} width={520}>
      <form onSubmit={handleSubmit} noValidate>
        <StatusBanner status={status} />
        <Field label={t("studio.titleLabel")} htmlFor="st-title" error={errors.title}>
          <input id="st-title" maxLength={MAX_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        {!editing && (
          <Field label={t("studio.audioLabel")} htmlFor="st-audio" error={errors.audio}>
            <input
              id="st-audio"
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              onChange={(e) => setAudio(e.target.files?.[0] || null)}
            />
            <span className="sb-hint">{t("studio.audioHint")}</span>
          </Field>
        )}

        <Field
          label={editing ? t("studio.changeCover") : t("studio.coverLabel")}
          htmlFor="st-cover"
          error={errors.cover}
        >
          <input
            id="st-cover"
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files?.[0] || null)}
          />
          <span className="sb-hint">{t("studio.coverHint")}</span>
        </Field>

        <Field label={t("studio.genreLabel")} htmlFor="st-genre">
          <select id="st-genre" value={genreId} onChange={(e) => setGenreId(e.target.value)}>
            <option value="">{t("studio.genreNone")}</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </Field>

        <Field label={t("studio.featLabel")} error={null}>
          <FeaturedPicker value={feat} onChange={setFeat} />
        </Field>

        {!editing && (
          <Field label={t("studio.releaseLabel")} htmlFor="st-release" error={errors.releaseAt}>
            <input
              id="st-release"
              type="datetime-local"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
            />
            <span className="sb-hint">{t("studio.releaseHint")}</span>
          </Field>
        )}

        {editing && song.status === SongStatus.REJECTED && (
          <p className="sb-hint" style={{ marginBottom: 12 }}>{t("studio.resubmitHint")}</p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Button variant="outline" onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
          <Button type="submit" isLoading={busy}>{editing ? t("common.save") : t("studio.upload")}</Button>
        </div>
      </form>
    </Modal>
  );
}

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
  const [songs, setSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreFilter, setGenreFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  // modal: null | { kind: "form" | "schedule" | "delete", song? }
  const [modal, setModal] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await artistService.getMySongs();
      if (mounted.current) setSongs(Array.isArray(list) ? list : []);
    } catch (err) {
      if (mounted.current) setStatus({ type: "error", message: extractErrorMessage(err, t("studio.loadFailed")) });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    mounted.current = true;
    Promise.resolve().then(load);
    songService.getGenres().then((g) => mounted.current && setGenres(Array.isArray(g) ? g : []));
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

  const genreName = (song) => genres.find((g) => String(g.id) === String(artistService.getSongGenre(song)))?.name;
  // Sắp xếp theo thể loại: lọc theo thể loại đang chọn
  const shown = genreFilter
    ? songs.filter((s) => String(artistService.getSongGenre(s)) === String(genreFilter))
    : songs;

  return (
    <div className="admin-page">
      <div className="studio-head">
        <h1 className="playlist-header-title" style={{ fontSize: 40 }}>{t("studio.title")}</h1>
        <Button onClick={() => setModal({ kind: "form", song: null })}>+ {t("studio.addSong")}</Button>
      </div>

      <StatusBanner status={status} />

      {songs.length > 0 && (
        <div className="genre-chips">
          <button className={genreFilter === "" ? "active" : ""} onClick={() => setGenreFilter("")}>
            {t("studio.allGenres")}
          </button>
          {genres.map((g) => (
            <button key={g.id} className={String(genreFilter) === String(g.id) ? "active" : ""} onClick={() => setGenreFilter(g.id)}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {songs.length === 0 ? (
        <p className="sb-hint">{t("studio.empty")}</p>
      ) : shown.length === 0 ? (
        <p className="sb-hint">{t("studio.emptyGenre")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="artist-songs">
            <thead>
              <tr>
                <th>{t("studio.colSong")}</th>
                <th>{t("studio.colStatus")}</th>
                <th>{t("studio.colRelease")}</th>
                <th>{t("studio.colPlays")}</th>
                <th>{t("studio.colLikes")}</th>
                <th>{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => {
                const state = songState(s);
                const busy = busyId === s.id;
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
                            {genreName(s) && ` · ${genreName(s)}`}
                            {s.featuredArtists?.length > 0 &&
                              ` · feat. ${s.featuredArtists.map((a) => a.artistName).join(", ")}`}
                          </div>
                        </div>
                      </div>
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
                    {/* likeCount do backend trả về; chưa có thì hiện "—" */}
                    <td>{s.likeCount ?? "—"}</td>
                    <td>
                      <div className="studio-actions">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setModal({ kind: "form", song: s })}>
                          {t("common.edit")}
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
        <SongFormModal song={modal.song} genres={genres} onClose={() => setModal(null)} onSaved={afterSave} />
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
