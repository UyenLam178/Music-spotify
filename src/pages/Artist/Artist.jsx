import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as songService from "../../services/songService";
import { usePlayer } from "../../context/PlayerContext";
import SongRow from "../../components/Music/SongRow";
import Loading from "../../components/Common/Loading";
import LoginPrompt from "../../components/Common/LoginPrompt";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../services/api";
import { IconPlay } from "../../components/Common/Icons";

export default function Artist() {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { id } = useParams();
    const { playQueue } = usePlayer();
    const [artist, setArtist] = useState(null);

    const [error, setError] = useState("");

    useEffect(() => {
        if (!isAuthenticated) return undefined;
        let cancelled = false;
        setArtist(null);
        setError("");
        songService
            .getArtistById(id)
            .then((a) => !cancelled && setArtist(a || false))
            .catch((err) => {
                if (cancelled) return;
                setError(extractErrorMessage(err));
                setArtist(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id, isAuthenticated]);

    if (!isAuthenticated) return <LoginPrompt />;
    if (artist === null) return <Loading full />;
    if (artist === false) {
        return (
            <div className="empty-state">
                <h2>{error || t("artist.notFound")}</h2>
            </div>
        );
    }

    const topSongs = artist.topSongs || [];

    return (
        <div>
            <div className="artist-banner">
                <img src={artist.avatarUrl} alt={artist.name} />
                <div className="artist-banner-overlay">
                    <span className="artist-banner-label">{t("artist.label")}</span>
                    <h1 className="artist-banner-name">{artist.name}</h1>
                    {artist.bio && <span className="artist-banner-followers">{artist.bio}</span>}
                </div>
            </div>

            <div style={{ padding: "20px 0" }}>
                <button
                    className="btn-icon play-btn"
                    onClick={() => topSongs.length && playQueue(topSongs, 0)}
                    aria-label={t("player.play")}
                >
                    <IconPlay />
                </button>
            </div>

            {topSongs.length === 0 && <p className="sb-hint">{t("artist.noSongs")}</p>}

            {topSongs.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("artist.topSongs")}</h2>
                    </div>
                    <div className="song-list">
                        {topSongs.map((song, i) => (
                            <SongRow key={song.id} song={song} index={i} showPlays songList={topSongs} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
