import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "./Button";

// Backend yêu cầu đăng nhập cho mọi API xem / tìm kiếm / nghe nhạc (docs/song.md mục 14).
export default function LoginPrompt() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="empty-state">
            <h2>{t("common.loginRequiredTitle")}</h2>
            <p className="sb-hint">{t("common.loginRequiredHint")}</p>
            <Button onClick={() => navigate("/login")}>{t("common.login")}</Button>
        </div>
    );
}
