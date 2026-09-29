import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as userService from "../../services/userService";
import { extractErrorMessage } from "../../services/api";
import {
  validateOtp,
  validateNewPassword,
  validateConfirmPassword,
  LIMITS,
} from "../../utils/validators";
import Button from "../Common/Button";
import Field from "../Common/Field";
import StatusBanner from "../Common/StatusBanner";

const EMPTY = { currentPassword: "", otp: "", newPassword: "", confirmPassword: "" };

// UC09 Đổi mật khẩu (include UC02 Xác thực OTP, purpose CHANGE_PASSWORD)
//   Bước 1: nhập mật khẩu hiện tại -> backend kiểm tra và gửi OTP qua email
//   Bước 2: nhập OTP + mật khẩu mới + xác nhận -> backend cập nhật mật khẩu
export default function PasswordSection() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const cancel = () => {
    setStep(1);
    setForm(EMPTY);
    setErrors({});
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    if (!form.currentPassword) {
      setErrors({ currentPassword: t("validation.passwordRequired") });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await userService.requestChangePasswordOtp({ currentPassword: form.currentPassword });
      setStep(2);
      setStatus({ type: "success", message: t("profile.passwordOtpSent") });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    const keys = {
      otp: validateOtp(form.otp),
      newPassword: validateNewPassword(form.newPassword),
      confirmPassword: validateConfirmPassword(form.confirmPassword, form.newPassword),
    };
    const errs = {};
    Object.entries(keys).forEach(([f, k]) => k && (errs[f] = t(k)));
    if (!errs.newPassword && form.newPassword === form.currentPassword)
      errs.newPassword = t("validation.passwordSameAsOld");
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await userService.changePassword({ otp: form.otp.trim(), newPassword: form.newPassword });
      setStep(1);
      setForm(EMPTY);
      setStatus({ type: "success", message: t("profile.updatedPassword") });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err, t("otp.failedDefault")) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-section">
      <h2>{t("profile.changePassword")}</h2>
      <StatusBanner status={status} />

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} noValidate>
          <Field label={t("profile.currentPasswordLabel")} htmlFor="pf-cur-pw" error={errors.currentPassword}>
            <input
              id="pf-cur-pw"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={set("currentPassword")}
            />
          </Field>
          <Button type="submit" size="sm" isLoading={busy}>
            {t("profile.sendOtp")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleChange} noValidate>
          <Field label={t("otp.label")} htmlFor="pf-pw-otp" error={errors.otp}>
            <input
              id="pf-pw-otp"
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LIMITS.OTP_MAX}
              placeholder="••••••"
              value={form.otp}
              onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\s/g, "") })}
            />
          </Field>
          <Field label={t("resetPassword.newPasswordLabel")} htmlFor="pf-new-pw" error={errors.newPassword}>
            <input
              id="pf-new-pw"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={set("newPassword")}
            />
          </Field>
          <Field
            label={t("resetPassword.confirmNewPasswordLabel")}
            htmlFor="pf-confirm-pw"
            error={errors.confirmPassword}
          >
            <input
              id="pf-confirm-pw"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
            />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="outline" size="sm" onClick={cancel}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" isLoading={busy}>
              {t("profile.changePassword")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
