import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../services/api";
import { validateEmail } from "../../utils/validators";
import Button from "../Common/Button";

export default function LoginForm() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs = {};
    const emailKey = validateEmail(form.email);
    if (emailKey) errs.email = t(emailKey);
    // Đăng nhập chỉ cần kiểm tra "có nhập" - độ mạnh mật khẩu do backend quyết định
    if (!form.password) errs.password = t("validation.passwordRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate("/");
    } catch (err) {
      setServerError(extractErrorMessage(err, t("login.invalidCredentials")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && <div className="form-error-banner">{serverError}</div>}

      <div className="field">
        <label htmlFor="email">{t("auth.emailLabel")}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>

      <div className="field">
        <label htmlFor="password">{t("auth.passwordLabel")}</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.passwordLabel")}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {errors.password && <span className="field-error">{errors.password}</span>}
      </div>

      <Button type="submit" isLoading={isLoading} className="auth-submit">
        {t("common.login")}
      </Button>

      <div className="auth-links">
        <Link to="/forgot-password">{t("auth.forgotPasswordLink")}</Link>
      </div>
    </form>
  );
}
