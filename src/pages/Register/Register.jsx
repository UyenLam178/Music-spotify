import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RegisterForm from "../../components/Auth/RegisterForm";

export default function Register() {
    const { t } = useTranslation();
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="sb-brand auth-brand">
                    <span className="sb-logo-dot" />
                    <span>MySpotify</span>
                </div>
                <h1 className="auth-title">{t("register.title")}</h1>
                <RegisterForm />
                <div className="auth-divider" />
                <p className="auth-switch">
                    {t("register.haveAccountPrefix")}<Link to="/login">{t("register.loginHere")}</Link>
                </p>
            </div>
        </div>
    );
}
