import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
    const { t } = useTranslation();
    return (
        <div className="empty-state">
            <h1 style={{ fontSize: 64 }}>404</h1>
            <h2>{t("notFound.title")}</h2>
            <p className="sb-hint">{t("notFound.message")}</p>
            <Link to="/" className="btn btn-primary">
                {t("notFound.backHome")}
            </Link>
        </div>
    );
}
