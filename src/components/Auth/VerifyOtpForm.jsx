import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as authService from "../../services/authService";
import { extractErrorMessage } from "../../services/api";
import { validateOtp, LIMITS } from "../../utils/validators";
import Button from "../Common/Button";

/**
 * UC02 - Xác thực Email/OTP sau khi Đăng ký (UC01).
 * Thành công: tài khoản UNVERIFIED -> ACTIVE, chuyển về trang Đăng nhập.
 *
 * (Luồng Quên mật khẩu không qua trang này: OTP được kiểm tra ngay khi đặt lại
 * mật khẩu, xem pages/ResetPassword.)
 */
export default function VerifyOtpForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const email = state?.email || sessionStorage.getItem("pendingEmail");
  // Vào thẳng /verify-otp mà không đi qua Đăng ký -> không có email để xác thực
  if (!email) return <Navigate to="/register" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const key = validateOtp(otp);
    if (key) {
      setError(t(key));
      return;
    }
    setIsLoading(true);
    try {
      await authService.verifyOtp({ email, otp: otp.trim() });
      sessionStorage.removeItem("pendingEmail");
      navigate("/login", { state: { notice: "verified", email }, replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, t("otp.failedDefault")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="form-error-banner">{error}</div>}

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
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\s/g, ""))}
        />
      </div>

      <Button type="submit" isLoading={isLoading} className="auth-submit">
        {t("otp.submit")}
      </Button>
    </form>
  );
}
