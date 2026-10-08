import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import VerifyOtpForm from "../../components/Auth/VerifyOtpForm";

export default function VerifyOtp() {
  const { t } = useTranslation();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="sb-brand auth-brand">
          <span className="sb-logo-dot" />
          <span>MySpotify</span>
        </div>
        <h1 className="auth-title">{t("otp.titleRegister")}</h1>
        <VerifyOtpForm />
        <div className="auth-divider" />
        <p className="auth-switch">
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
