import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as songService from "../../services/songService";
import { usePlayer } from "../../context/PlayerContext";
import SongRow from "../../components/Music/SongRow";
import Loading from "../../components/Common/Loading";
import { IconPlay } from "../../components/Common/Icons";

export default function Album() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { playQueue } = usePlayer();
    const [album, setAlbum] = useState(null);

    useEffect(() => {
        setAlbum(null);
        songService.getAlbumById(id).then(setAlbum);
    }, [id]);

    if (!album) return <Loading full />;

    const songs = album.songs || [];

    return (
        <div>
            <div className="playlist-header">
                <div className="playlist-header-cover">
                    <img src={album.coverUrl} alt={album.title} />
                </div>
                <div className="playlist-header-meta">
                    <span className="playlist-header-type">Album</span>
                    <h1 className="playlist-header-title">{album.title}</h1>
                    <div
                        className="playlist-header-stats"
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/artist/${album.artistId}`)}
                    >
                        <span style={{ fontWeight: 700 }}>{album.artistName}</span>
                        <span> · {songs.length} {t("album.songsCount")}</span>
                    </div>
                </div>
                <div className="playlist-header-actions">
                    <button
                        className="btn-icon play-btn"
                        onClick={() => songs.length && playQueue(songs, 0)}
                        aria-label={t("album.playAlbum")}
                    >
                        <IconPlay />
                    </button>
                </div>
            </div>

            <div className="song-list" style={{ marginTop: 24 }}>
                {songs.map((song, i) => (
                    <SongRow key={song.id} song={song} index={i} songList={songs} />
                ))}
            </div>
        </div>
    );
}
