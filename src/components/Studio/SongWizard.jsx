import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as artistService from "../../services/artistService";
import * as genreService from "../../services/genreService";
import * as songMeta from "../../services/songMetaService";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import { genreColor } from "../../services/genreService";
import { placeholderCover } from "../../utils/cover";
import {
  MAX_ALBUM, MAX_IMAGE, MAX_MP3, MAX_TITLE, MAX_WAV,
  formatBytes, formatDate, formatDuration, toApiDateTime,
} from "../../utils/studio";
import { SongStatus } from "../../utils/enums";
import Button from "../Common/Button";
import Field from "../Common/Field";
import Modal from "../Common/Modal";
import StatusBanner from "../Common/StatusBanner";
import { IconCheck, IconUpload } from "../Common/Icons";
import FeaturedPicker from "./FeaturedPicker";

// ---------------------------------------------------------------------------
// Wizard 3 bước, dùng chung cho THÊM NHẠC (UC26) và SỬA BÀI (UC29 + UC30):
//   1. Thể loại & thông tin nghệ sĩ   2. Tệp nhạc (nút Tải lên)   3. Album
// song = null → thêm mới; có song → sửa (tự điền lại toàn bộ thông tin đã lưu).
// ---------------------------------------------------------------------------
function Stepper({ step, labels }) {
  return (
    <ol className="wz-stepper">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className={`wz-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="wz-step-dot">{state === "done" ? <IconCheck /> : n}</span>
            <span className="wz-step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function GenreDot({ color }) {
  return <i className="genre-dot" style={{ background: `#${color}` }} />;
}

export default function SongWizard({ song, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const editing = !!song;
  const meta = useMemo(() => (song ? songMeta.getMeta(song.id) : null), [song]);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(song?.title || "");
  // Sửa bài: thể loại chỉ đọc (lấy từ bài); thêm mới: chọn 1 thể loại từ API
  const [genreId, setGenreId] = useState(song?.genreId != null ? String(song.genreId) : "");
  const [feat, setFeat] = useState(song?.featuredArtists || []);
  const [audio, setAudio] = useState(null);
  const [cover, setCover] = useState(null);
  const [releaseAt, setReleaseAt] = useState("");
  const [albumTitle, setAlbumTitle] = useState(meta?.albumTitle || "");
  const [genres, setGenres] = useState([]);
  const [genresError, setGenresError] = useState("");
  const [created, setCreated] = useState(null); // bài vừa tải lên (chế độ thêm mới)
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    genreService
      .getGenres()
      .then((list) => !cancelled && setGenres(list))
      .catch((err) => !cancelled && setGenresError(extractErrorMessage(err, t("genre.loadFailed"))));
    return () => {
      cancelled = true;
    };
  }, [t]);

  const myAlbums = useMemo(() => songMeta.getMyAlbums(user?.id), [user?.id]);
  const genre =
    genres.find((g) => String(g.id) === String(genreId)) ||
    (editing && song.genreName ? { id: song.genreId, name: song.genreName, color: genreColor(song.genreId) } : null);
  const artistName = user?.artistName || user?.username || "";
  const avatar = user?.avatarUrl ? resolveAssetUrl(user.avatarUrl) : "";

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview]
  );
  const currentCover =
    coverPreview ||
    (created?.coverUrl && resolveAssetUrl(created.coverUrl)) ||
    (song?.coverUrl && resolveAssetUrl(song.coverUrl)) ||
    placeholderCover(title, genre?.color);

  // ----- validate từng bước -----
  const validateStep1 = () => {
    const errs = {};
    if (!title.trim()) errs.title = t("studio.titleRequired");
    else if (title.trim().length > MAX_TITLE) errs.title = t("studio.titleLength", { max: MAX_TITLE });
    if (!editing && !genreId) errs.genre = t("wizard.genreRequired");
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
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

  const goNext = () => {
    setStatus({ type: "", message: "" });
    const errs = step === 1 ? validateStep1() : validateStep2();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setErrors({});
    setStatus({ type: "", message: "" });
    setStep((s) => s - 1);
  };

  // ----- Bước 2 (thêm mới): TẢI LÊN thật, rồi lưu thể loại -----
  const doUpload = async () => {
    setStatus({ type: "", message: "" });
    const errs = validateStep2();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setProgress(0);
    try {
      const resp = await artistService.uploadSong({
        title: title.trim(),
        genreId: Number(genreId),
        audio,
        cover,
        featuredArtistIds: feat.map((a) => a.id),
        releaseAt: toApiDateTime(releaseAt),
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded * 100) / e.total)),
      });
      songMeta.setMeta(resp.id, { albumTitle: "", artistId: resp.artistId ?? user?.id });
      setCreated(resp);
      setErrors({});
      setStep(3);
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  // ----- Bước 3: lưu album + hoàn tất -----
  const finish = async () => {
    setStatus({ type: "", message: "" });
    const album = albumTitle.trim();
    if (album.length > MAX_ALBUM) {
      setErrors({ album: t("wizard.albumLength", { max: MAX_ALBUM }) });
      return;
    }
    setErrors({});

    if (!editing) {
      songMeta.setMeta(created.id, { albumTitle: album });
      onSaved(t("studio.uploaded"));
      return;
    }

    setBusy(true);
    try {
      const featuredArtistIds = feat.map((a) => a.id);
      const resp = await artistService.updateSong(song.id, { title: title.trim(), featuredArtistIds });
      songMeta.setMeta(song.id, { albumTitle: album, artistId: resp.artistId ?? song.artistId });
      if (cover) {
        await artistService.updateCover(song.id, cover);
      }
      onSaved(t("studio.updated"));
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  // Đã tải lên rồi thì đóng modal cũng phải làm mới danh sách
  const handleClose = () => {
    if (busy) return;
    if (created) onSaved(t("studio.uploaded"));
    else onClose();
  };

  const pickAudio = (file) => file && setAudio(file);
  const pickCover = (file) => file && setCover(file);
  const labels = [t("wizard.step1"), t("wizard.step2"), t("wizard.step3")];

  return (
    <Modal isOpen onClose={handleClose} title={editing ? t("studio.editSong") : t("studio.addSong")} width={640}>
      <Stepper step={step} labels={labels} />
      <StatusBanner status={status} />

      {/* ---------------- Bước 1: thể loại + nghệ sĩ ---------------- */}
      {step === 1 && (
        <div className="wz-body">
          <Field label={t("studio.titleLabel")} htmlFor="wz-title" error={errors.title}>
            <input id="wz-title" maxLength={MAX_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <div className="field">
            <label id="wz-genre-label">{t("wizard.genreLabel")}</label>
            {editing ? (
              <>
                {genre ? (
                  <div>
                    <span className="genre-pill">
                      <GenreDot color={genre.color} />
                      {genre.name}
                    </span>
                  </div>
                ) : (
                  <span className="sb-hint">{t("wizard.genreNone")}</span>
                )}
                <span className="sb-hint">{t("wizard.genreHint")}</span>
              </>
            ) : (
              <>
                <div className="wz-genres" role="radiogroup" aria-labelledby="wz-genre-label">
                  {genres.map((g) => {
                    const selected = String(g.id) === String(genreId);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`wz-genre${selected ? " selected" : ""}`}
                        onClick={() => setGenreId(String(g.id))}
                      >
                        <GenreDot color={g.color} />
                        <span>{g.name}</span>
                        {selected && <IconCheck className="wz-genre-check" />}
                      </button>
                    );
                  })}
                </div>
                {genresError && <span className="field-error">{genresError}</span>}
                {errors.genre && <span className="field-error">{errors.genre}</span>}
                <span className="sb-hint">{t("wizard.genreHint")}</span>
              </>
            )}
          </div>

          <div className="field">
            <label>{t("wizard.artistInfo")}</label>
            <div className="wz-artist">
              <div className="wz-artist-avatar">
                {avatar ? <img src={avatar} alt="" /> : <span>{artistName.charAt(0).toUpperCase() || "♪"}</span>}
              </div>
              <div>
                <strong>{artistName}</strong>
                <div className="sb-hint">{t("wizard.mainArtist")}</div>
              </div>
            </div>
          </div>

          <Field label={t("studio.featLabel")} error={null}>
            <FeaturedPicker value={feat} onChange={setFeat} />
          </Field>
        </div>
      )}

      {/* ---------------- Bước 2: tệp nhạc + nút Tải lên ---------------- */}
      {step === 2 && (
        <div className="wz-body">
          {editing ? (
            <div className="wz-current-file">
              <strong>{t("wizard.currentAudio")}</strong>
              <div className="sb-hint">
                {(song.audioUrl || "").split("/").pop()} · {formatDuration(song.durationSeconds)}
                {song.releaseAt ? ` · ${t("studio.colRelease")}: ${formatDate(song.releaseAt)}` : ""}
              </div>
              <div className="sb-hint">{t("wizard.audioLocked")}</div>
            </div>
          ) : (
            <Field label={t("studio.audioLabel")} htmlFor="wz-audio" error={errors.audio}>
              <label
                className={`wz-drop${audio ? " has-file" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickAudio(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  id="wz-audio"
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/wav"
                  disabled={busy}
                  onChange={(e) => pickAudio(e.target.files?.[0])}
                />
                <IconUpload className="wz-drop-icon" />
                {audio ? (
                  <span className="wz-drop-text">
                    <strong>{audio.name}</strong>
                    <small>{formatBytes(audio.size)} · {t("wizard.clickToChange")}</small>
                  </span>
                ) : (
                  <span className="wz-drop-text">
                    <strong>{t("wizard.dropAudio")}</strong>
                    <small>{t("studio.audioHint")}</small>
                  </span>
                )}
              </label>
            </Field>
          )}

          <Field label={editing ? t("studio.changeCover") : t("studio.coverLabel")} htmlFor="wz-cover" error={errors.cover}>
            <div className="wz-cover-row">
              <img className="wz-cover-preview" src={currentCover} alt="" />
              <label className="wz-drop compact">
                <input
                  id="wz-cover"
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => pickCover(e.target.files?.[0])}
                />
                <span className="wz-drop-text">
                  <strong>{cover ? cover.name : t("wizard.chooseCover")}</strong>
                  <small>{t("studio.coverHint")}</small>
                </span>
              </label>
            </div>
          </Field>

          {!editing && (
            <Field label={t("studio.releaseLabel")} htmlFor="wz-release" error={errors.releaseAt}>
              <input
                id="wz-release"
                type="datetime-local"
                value={releaseAt}
                disabled={busy}
                onChange={(e) => setReleaseAt(e.target.value)}
              />
              <span className="sb-hint">{t("studio.releaseHint")}</span>
            </Field>
          )}

          {editing && song.status === SongStatus.REJECTED && (
            <p className="sb-hint">{t("studio.resubmitHint")}</p>
          )}

          {busy && !editing && (
            <div className="wz-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="wz-progress-bar" style={{ width: `${progress}%` }} />
              <span>{t("wizard.uploading", { pct: progress })}</span>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Bước 3: album ---------------- */}
      {step === 3 && (
        <div className="wz-body">
          {!editing && (
            <div className="wz-success">
              <IconCheck /> <span>{t("wizard.uploadedOk")}</span>
            </div>
          )}

          <div className="wz-summary">
            <img src={currentCover} alt="" />
            <div>
              <strong>{title}</strong>
              <div className="sb-hint">
                {[artistName, ...feat.map((a) => a.artistName)].filter(Boolean).join(", ")}
              </div>
              {genre && (
                <span className="genre-pill">
                  <GenreDot color={genre.color} />
                  {genre.name}
                </span>
              )}
            </div>
          </div>

          <Field label={t("wizard.albumLabel")} htmlFor="wz-album" error={errors.album}>
            <input
              id="wz-album"
              maxLength={MAX_ALBUM}
              value={albumTitle}
              placeholder={t("wizard.albumPlaceholder")}
              onChange={(e) => setAlbumTitle(e.target.value)}
            />
            <span className="sb-hint">{t("wizard.albumHint")}</span>
          </Field>

          {myAlbums.length > 0 && (
            <div className="wz-albums">
              <span className="sb-hint">{t("wizard.yourAlbums")}</span>
              <div className="studio-chips">
                {myAlbums.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`wz-chip${a === albumTitle.trim() ? " selected" : ""}`}
                    onClick={() => setAlbumTitle(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Nút điều hướng ---------------- */}
      <div className="wz-footer">
        {step > 1 && !(step === 3 && !editing) ? (
          <Button variant="outline" onClick={goBack} disabled={busy}>{t("wizard.back")}</Button>
        ) : (
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {step === 3 && !editing ? t("wizard.skipAlbum") : t("common.cancel")}
          </Button>
        )}

        {step === 1 && <Button onClick={goNext}>{t("wizard.next")}</Button>}
        {step === 2 && editing && <Button onClick={goNext}>{t("wizard.next")}</Button>}
        {step === 2 && !editing && (
          <Button className="wz-upload-btn" isLoading={busy} onClick={doUpload}>
            <IconUpload /> {t("studio.upload")}
          </Button>
        )}
        {step === 3 && (
          <Button isLoading={busy} onClick={finish}>
            {editing ? t("common.save") : t("wizard.finish")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
