import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLikes } from "../../context/LikeContext";
import { IconHeart } from "./Icons";

// Nút tim dùng chung (danh sách bài hát + thanh phát nhạc) => trạng thái luôn đồng bộ.
export default function LikeButton({ song }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLiked, toggleLike, canLike } = useLikes();
  if (!song) return null;
  const liked = isLiked(song.id);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!canLike) {
      navigate("/login");
      return;
    }
    toggleLike(song);
  };

  const label = liked ? t("common.unlike") : t("common.like");
  return (
    <button
      type="button"
      className={`btn-icon like-btn${liked ? " liked" : ""}`}
      aria-label={label}
      aria-pressed={liked}
      title={canLike ? label : t("auth.loginRequired")}
      onClick={handleClick}
    >
      <IconHeart filled={liked} />
    </button>
  );
}
