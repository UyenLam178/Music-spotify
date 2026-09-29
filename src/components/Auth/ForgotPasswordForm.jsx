import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as authService from "../../services/authService";
import { extractErrorMessage } from "../../services/api";
import { validateEmail } from "../../utils/validators";
import Button from "../Common/Button";

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const emailKey = validateEmail(email);
    if (emailKey) {
      setError(t(emailKey));
      return;
    }
    setIsLoading(true);
    const trimmed = email.trim();
    try {
      await authService.forgotPassword(trimmed);
      // Quên mật khẩu -> nhập OTP + mật khẩu mới (Đặt lại mật khẩu) -> Đăng nhập
      navigate("/reset-password", { state: { email: trimmed } });
    } catch (err) {
      setError(extractErrorMessage(err, t("forgotPassword.failedDefault")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="form-error-banner">{error}</div>}
      <p className="sb-hint" style={{ marginBottom: 16 }}>
        {t("forgotPassword.hint")}
      </p>
      <div className="field">
        <label htmlFor="fp-email">{t("auth.emailLabel")}</label>
        <input
          id="fp-email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" isLoading={isLoading} className="auth-submit">
        {t("forgotPassword.submit")}
      </Button>
    </form>
  );
}
