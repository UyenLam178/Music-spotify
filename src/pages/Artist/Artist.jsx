import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as songService from "../../services/songService";
import { usePlayer } from "../../context/PlayerContext";
import SongRow from "../../components/Music/SongRow";
import AlbumCard from "../../components/Music/AlbumCard";
import Loading from "../../components/Common/Loading";
import { IconPlay } from "../../components/Common/Icons";

export default function Artist() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const { playQueue } = usePlayer();
    const [artist, setArtist] = useState(null);

    useEffect(() => {
        setArtist(null);
        songService.getArtistById(id).then(setArtist);
    }, [id]);

    if (!artist) return <Loading full />;

    const topSongs = artist.topSongs || [];
    const albums = artist.albums || [];

    return (
        <div>
            <div className="artist-banner">
                <img src={artist.avatarUrl} alt={artist.name} />
                <div className="artist-banner-overlay">
                    <span className="artist-banner-label">{t("artist.label")}</span>
                    <h1 className="artist-banner-name">{artist.name}</h1>
                    {artist.followers != null && (
                        <span className="artist-banner-followers">
              {artist.followers.toLocaleString(i18n.language === "en" ? "en-US" : "vi-VN")} {t("artist.followers")}
            </span>
                    )}
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

            {topSongs.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("artist.topSongs")}</h2>
                    </div>
                    <div className="song-list">
                        {topSongs.map((song, i) => (
                            <SongRow key={song.id} song={song} index={i} songList={topSongs} />
                        ))}
                    </div>
                </section>
            )}

            {albums.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("search.albums")}</h2>
                    </div>
                    <div className="card-grid">
                        {albums.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
