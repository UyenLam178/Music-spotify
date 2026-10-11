import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as playlistService from "../../services/playlistService";
import * as likeService from "../../services/likeService";
import SongRow from "../../components/Music/SongRow";
import PlaylistCard from "../../components/Playlist/PlaylistCard";
import Loading from "../../components/Common/Loading";
import Button from "../../components/Common/Button";
import StatusBanner from "../../components/Common/StatusBanner";
import { extractErrorMessage } from "../../services/api";

export default function Library() {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [playlists, setPlaylists] = useState(null);
    const [creating, setCreating] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });

    const [tick, setTick] = useState(0);
    const [liked, setLiked] = useState([]);
    useEffect(() => {
        const on = () => setTick((n) => n + 1);
        window.addEventListener("mw:playlists-changed", on);
        window.addEventListener("mw:likes-changed", on);
        return () => {
            window.removeEventListener("mw:playlists-changed", on);
            window.removeEventListener("mw:likes-changed", on);
        };
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        likeService
            .getLikedSongs()
            .then((list) => setLiked(Array.isArray(list) ? list : []))
            .catch(() => setLiked([]));
    }, [isAuthenticated, tick]);

    useEffect(() => {
        if (!isAuthenticated) return;
        playlistService
            .getMyPlaylists()
            .then((data) => setPlaylists(Array.isArray(data) ? data : []))
            .catch(() => setPlaylists([]));
    }, [isAuthenticated, tick]);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const playlist = await playlistService.createPlaylist({
                name: t("library.defaultPlaylistName"),
                description: "",
                isPublic: false,
            });
            navigate(`/playlist/${playlist.id}`);
        } catch (err) {
            setStatus({ type: "error", message: extractErrorMessage(err) });
        } finally {
            setCreating(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="empty-state">
                <h2>{t("library.loginPrompt")}</h2>
                <p className="sb-hint">{t("library.loginHint")}</p>
                <Button onClick={() => navigate("/login")}>{t("common.login")}</Button>
            </div>
        );
    }

    if (playlists === null) return <Loading full />;

    return (
        <div>
            <div className="section-head">
                <h1 style={{ fontSize: 24 }}>{t("library.title")}</h1>
                <Button size="sm" isLoading={creating} onClick={handleCreate}>
                    {t("library.createPlaylist")}
                </Button>
            </div>
            <StatusBanner status={status} />

            <section className="liked-section">
                <h2 style={{ fontSize: 18, marginBottom: 12 }}>{t("common.likedSongs")}</h2>
                {liked.length === 0 ? (
                    <p className="sb-hint">{t("library.likedEmpty")}</p>
                ) : (
                    <div className="song-list">
                        {liked.map((song, i) => (
                            <SongRow key={song.id} song={song} index={i} songList={liked} />
                        ))}
                    </div>
                )}
            </section>

            {playlists.length === 0 ? (
                <p className="sb-hint">{t("library.empty")}</p>
            ) : (
                <div className="card-grid">
                    {playlists.map((pl) => (
                        <PlaylistCard key={pl.id} playlist={pl} />
                    ))}
                </div>
            )}
        </div>
    );
}
