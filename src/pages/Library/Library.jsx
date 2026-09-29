import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as playlistService from "../../services/playlistService";
import PlaylistCard from "../../components/Playlist/PlaylistCard";
import Loading from "../../components/Common/Loading";
import Button from "../../components/Common/Button";

export default function Library() {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [playlists, setPlaylists] = useState(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setPlaylists([]);
            return;
        }
        playlistService
            .getMyPlaylists()
            .then((data) => setPlaylists(Array.isArray(data) ? data : []))
            .catch(() => setPlaylists([]));
    }, [isAuthenticated]);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const playlist = await playlistService.createPlaylist({
                name: t("library.defaultPlaylistName"),
                description: "",
                isPublic: false,
            });
            navigate(`/playlist/${playlist.id}`);
        } catch {
            // im lặng bỏ qua nếu backend chưa có API
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
