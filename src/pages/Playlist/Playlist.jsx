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
    const [editForm, setEditForm] = useState({ name: "", description: "", isPublic: true, coverImageUrl: "" });
    const [saving, setSaving] = useState(false);

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
                    coverImageUrl: data.coverImageUrl || "",
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
    const isOwner = user && playlist.ownerId && user.id === playlist.ownerId;

    const handlePlayAll = () => {
        if (songs.length) playQueue(songs, 0);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await playlistService.updatePlaylist(id, editForm);
            setPlaylist((prev) => ({ ...prev, ...updated }));
            setEditOpen(false);
        } catch (err) {
            setError(extractErrorMessage(err, t("playlist.updateFailedDefault")));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PlaylistHeader
                playlist={playlist}
                songCount={songs.length}
                totalDuration={totalDuration}
                onPlay={handlePlayAll}
                onEdit={isOwner ? () => setEditOpen(true) : undefined}
            />

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
                        <SongRow key={song.id} song={song} index={i} songList={songs} />
                    ))}
                </div>
            )}

            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={t("playlist.editDetails")}>
                <form onSubmit={handleSaveEdit}>
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
                    <div className="field">
                        <label>{t("playlist.coverUrlLabel")}</label>
                        <input
                            value={editForm.coverImageUrl}
                            onChange={(e) => setEditForm({ ...editForm, coverImageUrl: e.target.value })}
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
                </form>
            </Modal>
        </div>
    );
}
