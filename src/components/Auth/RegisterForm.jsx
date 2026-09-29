import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../services/api";
import {
  validateUsername,
  validateEmail,
  validateNewPassword,
  validateConfirmPassword,
} from "../../utils/validators";
import Button from "../Common/Button";

export default function RegisterForm() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const keys = {
      username: validateUsername(form.username),
      email: validateEmail(form.email),
      password: validateNewPassword(form.password),
      confirmPassword: validateConfirmPassword(form.confirmPassword, form.password),
    };
    const errs = {};
    Object.entries(keys).forEach(([field, key]) => {
      if (key) errs[field] = t(key);
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setIsLoading(true);
    const email = form.email.trim();
    try {
      // RegisterRequest: chỉ gửi username, email, password (confirmPassword chỉ dùng ở UI)
      await register({ username: form.username.trim(), email, password: form.password });
      // Đăng ký -> Xác thực Email/OTP -> Hoàn tất đăng ký (đăng nhập)
      navigate("/verify-otp", { state: { email } });
    } catch (err) {
      setServerError(extractErrorMessage(err, t("register.failedDefault")));
    } finally {
      setIsLoading(false);
    }
  };

  const field = (id, label, props = {}) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={form[id]}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        {...props}
      />
      {errors[id] && <span className="field-error">{errors[id]}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && <div className="form-error-banner">{serverError}</div>}

      {field("username", t("auth.usernameLabel"), {
        type: "text",
        autoComplete: "username",
        placeholder: t("auth.usernamePlaceholder"),
      })}
      {field("email", t("auth.emailLabel"), {
        type: "email",
        autoComplete: "email",
        placeholder: t("auth.emailPlaceholder"),
      })}
      {field("password", t("auth.passwordLabel"), {
        type: "password",
        autoComplete: "new-password",
        placeholder: t("auth.createPasswordPlaceholder"),
      })}
      {field("confirmPassword", t("auth.confirmPasswordLabel"), {
        type: "password",
        autoComplete: "new-password",
        placeholder: t("auth.reenterPasswordPlaceholder"),
      })}

      <Button type="submit" isLoading={isLoading} className="auth-submit">
        {t("common.register")}
      </Button>
    </form>
  );
}
