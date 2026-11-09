import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../Common/Modal";
import Button from "../Common/Button";
import { IconCheck } from "../Common/Icons";
import * as playlistService from "../../services/playlistService";
import * as songService from "../../services/songService";
import { extractErrorMessage } from "../../services/api";

const normalize = (s = "") =>
  s.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

// Tạo playlist: backend bắt buộc có tên và ít nhất 1 bài hát (POST /api/playlists, multipart).
export default function CreatePlaylistModal({ isOpen, onClose, onCreated }) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("playlist.createTitle")} width={560}>
      <CreatePlaylistForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}

// Modal chỉ dựng phần thân khi đang mở => mỗi lần mở là form mới, không cần reset thủ công
function CreatePlaylistForm({ onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", description: "", isPublic: false });
  const [cover, setCover] = useState(null);
  const [songs, setSongs] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Tải danh sách bài hát đã phát hành để chọn
  useEffect(() => {
    let cancelled = false;
    songService
      .getAllSongs()
      .then((list) => !cancelled && setSongs(list))
      .catch(() => !cancelled && setSongs([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Xem trước ảnh bìa
  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : ""), [cover]);
  useEffect(() => () => coverPreview && URL.revokeObjectURL(coverPreview), [coverPreview]);

  const filtered = useMemo(() => {
    if (!songs) return [];
    const q = normalize(query.trim());
    if (!q) return songs;
    return songs.filter((s) => normalize(`${s.title} ${s.artistName}`).includes(q));
  }, [songs, query]);

  const toggle = (id) => {
    setError("");
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= playlistService.MAX_SONGS_PER_PLAYLIST) {
        setError(t("playlist.maxSongs", { max: playlistService.MAX_SONGS_PER_PLAYLIST }));
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCover = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!playlistService.COVER_TYPES.includes(file.type)) return setError(t("playlist.coverInvalid"));
    if (file.size > playlistService.MAX_COVER_BYTES) return setError(t("playlist.coverTooBig"));
    setError("");
    setCover(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t("playlist.nameRequired"));
    if (selected.length === 0) return setError(t("playlist.minOneSong"));
    setSaving(true);
    setError("");
    try {
      const playlist = await playlistService.createPlaylist({
        name: form.name.trim(),
        description: form.description.trim(),
        isPublic: form.isPublic,
        songIds: selected,
        cover,
      });
      onCreated?.(playlist);
      onClose?.();
    } catch (err) {
      setError(extractErrorMessage(err, t("playlist.createFailedDefault")));
    } finally {
      setSaving(false);
    }
  };

  return (
      <form onSubmit={handleSubmit} className="pl-create-form">
        {error && <div className="form-error-banner">{error}</div>}

        <div className="pl-create-top">
          <label className="pl-cover-pick" title={t("playlist.coverLabel")}>
            {coverPreview ? <img src={coverPreview} alt="" /> : <span>♪</span>}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCover} hidden />
            <em>{coverPreview ? t("playlist.coverChange") : t("playlist.coverChoose")}</em>
          </label>
          <div className="pl-create-fields">
            <div className="field">
              <label htmlFor="pl-name">{t("playlist.nameLabel")}</label>
              <input
                id="pl-name"
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="pl-desc">{t("playlist.descriptionLabel")}</label>
              <textarea
                id="pl-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        <label className="pl-public-check">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
          {t("playlist.publicCheckbox")}
        </label>

        <div className="pl-pick-head">
          <h3>{t("playlist.pickSongs")}</h3>
          <span className="sb-hint">{t("playlist.selectedCount", { count: selected.length })}</span>
        </div>
        <input
          className="pl-pick-search"
          type="text"
          placeholder={t("playlist.searchSongs")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="pl-pick-songs">
          {songs === null && <p className="sb-hint">{t("common.processing")}</p>}
          {songs !== null && filtered.length === 0 && <p className="sb-hint">{t("playlist.noSongsFound")}</p>}
          {filtered.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                className={`pl-pick-song${on ? " on" : ""}`}
                onClick={() => toggle(s.id)}
                aria-pressed={on}
              >
                <img src={s.coverUrl} alt="" />
                <span className="pl-pick-song-meta">
                  <strong>{s.title}</strong>
                  <small>{s.artistName}</small>
                </span>
                <span className="pl-pick-song-check">{on && <IconCheck />}</span>
              </button>
            );
          })}
        </div>

        <Button type="submit" isLoading={saving} className="auth-submit">
          {t("playlist.createSubmit")}
        </Button>
      </form>
  );
}
