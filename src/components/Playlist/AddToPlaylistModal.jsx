import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../Common/Modal";
import * as playlistService from "../../services/playlistService";
import { extractErrorMessage } from "../../services/api";

// Thêm 1 bài hát vào playlist có sẵn, hoặc tạo playlist mới rồi thêm luôn.
export default function AddToPlaylistModal({ isOpen, onClose, song }) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setStatus({ type: "", message: "" });
      setLoading(true);
      playlistService
        .getMyPlaylists()
        .then((data) => !cancelled && setPlaylists(Array.isArray(data) ? data : []))
        .catch(() => !cancelled && setPlaylists([]))
        .finally(() => !cancelled && setLoading(false));
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const add = async (playlistId) => {
    try {
      await playlistService.addSongToPlaylist(playlistId, song);
      setStatus({ type: "success", message: t("playlist.addedToPlaylist", { title: song.title }) });
    } catch (err) {
      const msg = err?.response?.status === 409 ? t("playlist.alreadyIn") : extractErrorMessage(err);
      setStatus({ type: "error", message: msg });
    }
  };

  const createAndAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setStatus({ type: "error", message: t("playlist.nameRequired") });
      return;
    }
    try {
      const pl = await playlistService.createPlaylist({ name, description: "", isPublic: false });
      setPlaylists((prev) => [pl, ...prev]);
      setNewName("");
      await add(pl.id);
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

      <form onSubmit={createAndAdd} className="playlist-new-row">
        <input
          value={newName}
          maxLength={100}
          placeholder={t("playlist.newOne")}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">{t("playlist.create")}</button>
      </form>

      {loading && <p className="sb-hint">{t("playlist.loadingPlaylists")}</p>}
      {!loading && playlists.length === 0 && <p className="sb-hint">{t("playlist.noneCreateFirst")}</p>}
      <div className="playlist-pick-list">
        {playlists.map((pl) => (
          <button key={pl.id} className="playlist-pick-item" onClick={() => add(pl.id)}>
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
