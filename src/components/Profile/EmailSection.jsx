import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as userService from "../../services/userService";
import { extractErrorMessage } from "../../services/api";
import { validateEmail, validateOtp, LIMITS } from "../../utils/validators";
import Button from "../Common/Button";
import Field from "../Common/Field";
import StatusBanner from "../Common/StatusBanner";
import { maskEmail } from "../../utils/mask";

// UC13 Cập nhật email (include UC02 Xác thực OTP, purpose CHANGE_EMAIL)
//   Bước 1: nhập email mới -> backend kiểm tra chưa được dùng, gửi OTP tới email mới
//   Bước 2: nhập OTP       -> backend xác thực và cập nhật email
export default function EmailSection() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep(1);
    setOtp("");
    setError("");
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    const email = newEmail.trim();
    const key = validateEmail(email);
    if (key) return setError(t(key));
    if (email.toLowerCase() === (user?.email || "").toLowerCase()) return setError(t("profile.sameEmail"));
    setError("");
    setBusy(true);
    try {
      await userService.requestUpdateEmailOtp({ newEmail: email });
      setNewEmail(email);
      setStep(2);
      setStatus({ type: "success", message: t("profile.emailOtpSent", { email }) });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    const key = validateOtp(otp);
    if (key) return setError(t(key));
    setError("");
    setBusy(true);
    try {
      await userService.updateEmail({ otp: otp.trim() });
      setUser((prev) => ({ ...prev, email: newEmail }));
      setNewEmail("");
      reset();
      setStatus({ type: "success", message: t("profile.updatedEmail") });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err, t("otp.failedDefault")) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-section">
      <h2>{t("profile.changeEmail")}</h2>
      <p className="sb-hint" style={{ marginBottom: 12 }}>
        {t("profile.currentEmail")}: <strong>{maskEmail(user?.email)}</strong>
      </p>
      <StatusBanner status={status} />

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} noValidate>
          <Field label={t("profile.newEmailLabel")} htmlFor="pf-new-email" error={error}>
            <input
              id="pf-new-email"
              type="email"
              maxLength={LIMITS.EMAIL_MAX}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" size="sm" isLoading={busy}>
            {t("profile.sendOtp")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} noValidate>
          <Field label={t("otp.label")} htmlFor="pf-email-otp" error={error}>
            <input
              id="pf-email-otp"
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LIMITS.OTP_MAX}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\s/g, ""))}
            />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="outline" size="sm" onClick={reset}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" isLoading={busy}>
              {t("profile.confirmEmail")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
