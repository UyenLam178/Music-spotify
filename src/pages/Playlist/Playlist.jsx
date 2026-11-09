import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as playlistService from "../../services/playlistService";
import { extractErrorMessage } from "../../services/api";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import PlaylistHeader from "../../components/Playlist/PlaylistHeader";
import SongRow from "../../components/Music/SongRow";
import Loading from "../../components/Common/Loading";
import Modal from "../../components/Common/Modal";
import Button from "../../components/Common/Button";

export default function Playlist() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { playQueue } = usePlayer();
    const [playlist, setPlaylist] = useState(null);
    const [error, setError] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", description: "", isPublic: true });
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState("");
    const [coverBusy, setCoverBusy] = useState(false);
    const [actionError, setActionError] = useState("");

    const load = () => {
        setError("");
        setPlaylist(null);
        playlistService
            .getPlaylistById(id)
            .then((data) => {
                setPlaylist(data);
                setEditForm({
                    name: data.name || "",
                    description: data.description || "",
                    isPublic: data.isPublic ?? true,
                });
            })
            .catch((err) => setError(extractErrorMessage(err, t("playlist.loadFailedDefault"))));
    };

    useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (error) {
        return (
            <div className="empty-state">
                <h2>{t("playlist.notFoundTitle")}</h2>
                <p className="sb-hint">{error}</p>
                <Button variant="outline" onClick={() => navigate("/library")}>
                    {t("playlist.backToLibrary")}
                </Button>
            </div>
        );
    }

    if (!playlist) return <Loading full />;

    const songs = playlist.songs || [];
    const totalDuration = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
    // Backend trả sẵn isOwner; dự phòng so sánh id người dùng
    const isOwner = playlist.isOwner ?? !!(user && playlist.ownerId && user.id === playlist.ownerId);

    const handlePlayAll = () => {
        if (songs.length) playQueue(songs, 0);
    };

    // Các API sửa trả về bản playlist mới (kèm danh sách bài) => cập nhật luôn
    const applyUpdated = (updated) => setPlaylist((prev) => ({ ...prev, ...updated }));

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editForm.name.trim()) return setEditError(t("playlist.nameRequired"));
        setSaving(true);
        setEditError("");
        try {
            applyUpdated(await playlistService.updatePlaylist(id, { ...editForm, name: editForm.name.trim() }));
            setEditOpen(false);
        } catch (err) {
            setEditError(extractErrorMessage(err, t("playlist.updateFailedDefault")));
        } finally {
            setSaving(false);
        }
    };

    const handleCoverPick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!playlistService.COVER_TYPES.includes(file.type)) return setEditError(t("playlist.coverInvalid"));
        if (file.size > playlistService.MAX_COVER_BYTES) return setEditError(t("playlist.coverTooBig"));
        setCoverBusy(true);
        setEditError("");
        try {
            applyUpdated(await playlistService.updatePlaylistCover(id, file));
        } catch (err) {
            setEditError(extractErrorMessage(err, t("playlist.updateFailedDefault")));
        } finally {
            setCoverBusy(false);
        }
    };

    const handleCoverRemove = async () => {
        setCoverBusy(true);
        setEditError("");
        try {
            applyUpdated(await playlistService.removePlaylistCover(id));
        } catch (err) {
            setEditError(extractErrorMessage(err, t("playlist.updateFailedDefault")));
        } finally {
            setCoverBusy(false);
        }
    };

    const handleRemoveSong = async (song) => {
        try {
            applyUpdated(await playlistService.removeSongFromPlaylist(id, song.id));
        } catch (err) {
            setActionError(extractErrorMessage(err, t("playlist.removeSongFailed")));
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t("playlist.deleteConfirm"))) return;
        try {
            await playlistService.deletePlaylist(id);
            navigate("/library");
        } catch (err) {
            setEditError(extractErrorMessage(err, t("playlist.deleteFailed")));
        }
    };

    return (
        <div>
            <PlaylistHeader
                playlist={playlist}
                songCount={songs.length}
                totalDuration={totalDuration}
                onPlay={handlePlayAll}
                onEdit={isOwner ? () => { setEditError(""); setEditOpen(true); } : undefined}
            />

            {actionError && <p className="form-error-banner" style={{ marginTop: 16 }}>{actionError}</p>}

            {songs.length === 0 ? (
                <p className="sb-hint" style={{ marginTop: 24 }}>
                    {t("playlist.empty")}
                </p>
            ) : (
                <div className="song-list" style={{ marginTop: 24 }}>
                    <div className="song-list-head">
                        <span>#</span>
                        <span>{t("playlist.songListHeadTitle")}</span>
                        <span>Album</span>
                        <span></span>
                    </div>
                    {songs.map((song, i) => (
                        <SongRow
                            key={song.id}
                            song={song}
                            index={i}
                            showPlays
                            songList={songs}
                            onRemove={isOwner ? handleRemoveSong : undefined}
                        />
                    ))}
                </div>
            )}

            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={t("playlist.editDetails")}>
                <form onSubmit={handleSaveEdit}>
                    {editError && <div className="form-error-banner">{editError}</div>}
                    <div className="pl-edit-cover">
                        <div className="pl-edit-cover-img">
                            {playlist.coverImageUrl ? <img src={playlist.coverImageUrl} alt="" /> : <span>♪</span>}
                        </div>
                        <div className="pl-edit-cover-actions">
                            <label className={`btn btn-outline btn-sm${coverBusy ? " disabled" : ""}`}>
                                {playlist.coverImageUrl ? t("playlist.coverChange") : t("playlist.coverChoose")}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    disabled={coverBusy}
                                    onChange={handleCoverPick}
                                />
                            </label>
                            {playlist.hasCustomCover && (
                                <Button variant="ghost" size="sm" disabled={coverBusy} onClick={handleCoverRemove}>
                                    {t("playlist.coverRemove")}
                                </Button>
                            )}
                            <small className="sb-hint">{t("playlist.coverLabel")}</small>
                        </div>
                    </div>
                    <div className="field">
                        <label>{t("playlist.nameLabel")}</label>
                        <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>
                    <div className="field">
                        <label>{t("playlist.descriptionLabel")}</label>
                        <textarea
                            rows={3}
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                    </div>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, fontSize: 13 }}>
                        <input
                            type="checkbox"
                            checked={editForm.isPublic}
                            onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                        />
                        {t("playlist.publicCheckbox")}
                    </label>
                    <Button type="submit" isLoading={saving} className="auth-submit">
                        {t("playlist.saveChanges")}
                    </Button>
                    <Button variant="ghost" className="auth-submit pl-delete-btn" onClick={handleDelete}>
                        {t("playlist.delete")}
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
