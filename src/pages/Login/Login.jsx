import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoginForm from "../../components/Auth/LoginForm";

export default function Login() {
    const { t } = useTranslation();
    const location = useLocation();
    // notice được truyền từ trang Xác thực OTP ("verified") hoặc Đặt lại mật khẩu ("passwordReset")
    const notice = location.state?.notice;

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="sb-brand auth-brand">
                    <span className="sb-logo-dot" />
                    <span>Musicify</span>
                </div>
                <h1 className="auth-title">{t("login.title")}</h1>
                {notice === "verified" && (
                    <div className="form-success-banner">
                        {t("login.verifiedBanner", { email: location.state?.email })}
                    </div>
                )}
                {notice === "passwordReset" && (
                    <div className="form-success-banner">{t("login.passwordResetBanner")}</div>
                )}
                <LoginForm />
                <div className="auth-divider" />
                <p className="auth-switch">
                    {t("login.noAccountPrefix")}<Link to="/register">{t("login.registerNow")}</Link>
                </p>
            </div>
        </div>
    );
}
