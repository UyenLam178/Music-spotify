import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconPlay } from "../Common/Icons";

export default function AlbumCard({ album }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="media-card" onClick={() => navigate(`/album/${album.id}`)} role="button">
      <div className="media-card-cover">
        <img src={album.coverUrl} alt={album.title} />
        <button className="media-card-play" aria-label={t("player.play")} onClick={(e) => e.stopPropagation()}>
          <IconPlay />
        </button>
      </div>
      <p className="media-card-title" title={album.title}>
        {album.title}
      </p>
      <p className="media-card-sub">{album.artistName}</p>
    </div>
  );
}
