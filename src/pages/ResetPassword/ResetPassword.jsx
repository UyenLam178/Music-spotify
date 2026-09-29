import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as authService from "../../services/authService";
import { extractErrorMessage } from "../../services/api";
import {
  validateOtp,
  validateNewPassword,
  validateConfirmPassword,
  LIMITS,
} from "../../utils/validators";
import Button from "../../components/Common/Button";

// UC04 -> UC02 + UC05: sau "Quên mật khẩu", người dùng nhập OTP nhận qua email
// cùng mật khẩu mới. Backend kiểm tra và tiêu thụ OTP ngay trong resetPassword().
export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ otp: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const email = state?.email;
  if (!email) return <Navigate to="/forgot-password" replace />;

  const validate = () => {
    const keys = {
      otp: validateOtp(form.otp),
      newPassword: validateNewPassword(form.newPassword),
      confirmPassword: validateConfirmPassword(form.confirmPassword, form.newPassword),
    };
    const errs = {};
    Object.entries(keys).forEach(([f, k]) => k && (errs[f] = t(k)));
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setInfo("");
    if (!validate()) return;
    setIsLoading(true);
    try {
      await authService.resetPassword({
        email,
        otp: form.otp.trim(),
        newPassword: form.newPassword,
      });
      navigate("/login", { state: { notice: "passwordReset" }, replace: true });
    } catch (err) {
      setServerError(extractErrorMessage(err, t("resetPassword.failedDefault")));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setServerError("");
    setInfo("");
    setIsResending(true);
    try {
      await authService.forgotPassword(email);
      setInfo(t("otp.resent", { email }));
    } catch (err) {
      setServerError(extractErrorMessage(err, t("forgotPassword.failedDefault")));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="sb-brand auth-brand">
          <span className="sb-logo-dot" />
          <span>Musicify</span>
        </div>
        <h1 className="auth-title">{t("resetPassword.title")}</h1>
        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div className="form-error-banner">{serverError}</div>}
          {info && <div className="form-success-banner">{info}</div>}
          <p className="sb-hint" style={{ marginBottom: 16 }}>
            {t("otp.hintPrefix")}
            <strong>{email}</strong>
            {t("otp.hintSuffix")}
          </p>

          <div className="field">
            <label htmlFor="otp">{t("otp.label")}</label>
            <input
              id="otp"
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LIMITS.OTP_MAX}
              placeholder="••••••"
              value={form.otp}
              onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\s/g, "") })}
            />
            {errors.otp && <span className="field-error">{errors.otp}</span>}
          </div>
          <div className="field">
            <label htmlFor="newPassword">{t("resetPassword.newPasswordLabel")}</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
            {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">{t("resetPassword.confirmNewPasswordLabel")}</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>
          <Button type="submit" isLoading={isLoading} className="auth-submit">
            {t("resetPassword.submit")}
          </Button>

          <div className="auth-links">
            {t("otp.notReceived")}{" "}
            <button type="button" className="link-button" onClick={handleResend} disabled={isResending}>
              {isResending ? t("common.processing") : t("otp.resend")}
            </button>
          </div>
        </form>
        <div className="auth-divider" />
        <p className="auth-switch">
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
