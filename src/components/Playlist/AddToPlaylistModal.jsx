import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../Common/Modal";
import * as playlistService from "../../services/playlistService";
import { extractErrorMessage } from "../../services/api";

export default function AddToPlaylistModal({ isOpen, onClose, song }) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ type: "", message: "" });
    setLoading(true);
    playlistService
      .getMyPlaylists()
      .then((data) => setPlaylists(Array.isArray(data) ? data : []))
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleAdd = async (playlistId) => {
    try {
      await playlistService.addSongToPlaylist(playlistId, song.id);
      setStatus({ type: "success", message: t("playlist.addedToPlaylist", { title: song.title }) });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("common.addToPlaylist")}>
      {status.message && (
        <div className={status.type === "error" ? "form-error-banner" : "form-success-banner"}>
          {status.message}
        </div>
      )}
      {loading && <p className="sb-hint">{t("playlist.loadingPlaylists")}</p>}
      {!loading && playlists.length === 0 && (
        <p className="sb-hint">{t("playlist.noneCreateFirst")}</p>
      )}
      <div className="playlist-pick-list">
        {playlists.map((pl) => (
          <button key={pl.id} className="playlist-pick-item" onClick={() => handleAdd(pl.id)}>
            <div className="sb-playlist-cover">
              {pl.coverImageUrl ? <img src={pl.coverImageUrl} alt="" /> : <span>♪</span>}
            </div>
            <span>{pl.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
