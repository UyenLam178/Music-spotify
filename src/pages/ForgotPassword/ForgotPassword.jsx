import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ForgotPasswordForm from "../../components/Auth/ForgotPasswordForm";

export default function ForgotPassword() {
  const { t } = useTranslation();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="sb-brand auth-brand">
          <span className="sb-logo-dot" />
          <span>MySpotify</span>
        </div>
        <h1 className="auth-title">{t("forgotPassword.title")}</h1>
        <ForgotPasswordForm />
        <div className="auth-divider" />
        <p className="auth-switch">
          {t("forgotPassword.rememberedPrefix")}<Link to="/login">{t("common.login")}</Link>
        </p>
      </div>
    </div>
  );
}
