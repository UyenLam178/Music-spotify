import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ArtistCard({ artist }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div
      className="media-card artist-card"
      onClick={() => navigate(`/artist/${artist.id}`)}
      role="button"
    >
      <div className="media-card-cover artist-cover">
        <img src={artist.avatarUrl} alt={artist.name} />
      </div>
      <p className="media-card-title" title={artist.name}>
        {artist.name}
      </p>
      <p className="media-card-sub">{t("artist.label")}</p>
    </div>
  );
}
