import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as userService from "../../services/userService";
import { extractErrorMessage } from "../../services/api";
import { validateFullName, LIMITS } from "../../utils/validators";
import Button from "../Common/Button";
import Field from "../Common/Field";
import StatusBanner from "../Common/StatusBanner";

// UC07 Xem thông tin cá nhân + UC08 Cập nhật thông tin cá nhân (fullName)
export default function ProfileInfoSection() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    const key = validateFullName(fullName);
    setError(key ? t(key) : "");
    if (key) return;

    setSaving(true);
    try {
      const updated = await userService.updateProfile({ fullName: fullName.trim() });
      // Backend trả về User mới; nếu chỉ trả 200 rỗng thì tự cập nhật từ dữ liệu vừa gửi
      setUser((prev) => ({ ...prev, ...(updated || {}), fullName: updated?.fullName ?? fullName.trim() }));
      setStatus({ type: "success", message: t("profile.updatedProfile") });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-section">
      <h2>{t("profile.personalInfo")}</h2>
      <StatusBanner status={status} />
      <form onSubmit={handleSubmit} noValidate>
        <Field label={t("profile.usernameLabel")} htmlFor="pf-username">
          <input id="pf-username" value={user?.username || ""} readOnly disabled />
        </Field>
        <Field label={t("profile.fullNameLabel")} htmlFor="pf-fullname" error={error}>
          <input
            id="pf-fullname"
            maxLength={LIMITS.FULL_NAME_MAX}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>
        <Button type="submit" size="sm" isLoading={saving}>
          {t("profile.saveInfo")}
        </Button>
      </form>
    </section>
  );
}
