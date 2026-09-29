import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as userService from "../../services/userService";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import { LIMITS } from "../../utils/validators";
import Button from "../Common/Button";
import StatusBanner from "../Common/StatusBanner";

// UC10 Cập nhật ảnh đại diện -> UserService.updateAvatar(userId, file)
export default function AvatarSection() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  // Giải phóng URL tạm của ảnh xem trước
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const handlePick = (e) => {
    const picked = e.target.files?.[0];
    setStatus({ type: "", message: "" });
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setStatus({ type: "error", message: t("profile.imageInvalid") });
      return;
    }
    if (picked.size > LIMITS.AVATAR_MAX_BYTES) {
      setStatus({ type: "error", message: t("profile.imageTooLarge") });
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const updated = await userService.updateAvatar(file);
      if (updated?.avatarUrl) setUser((prev) => ({ ...prev, ...updated }));
      else await userService.getProfile().then((p) => setUser(p));
      setFile(null);
      setPreview("");
      if (inputRef.current) inputRef.current.value = "";
      setStatus({ type: "success", message: t("profile.updatedAvatar") });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const shown = preview || resolveAssetUrl(user?.avatarUrl);

  return (
    <section className="profile-section">
      <h2>{t("profile.avatar")}</h2>
      <StatusBanner status={status} />
      <form onSubmit={handleSubmit}>
        <div className="avatar-picker">
          <div className="avatar-picker-preview">{shown && <img src={shown} alt="" />}</div>
          <div>
            <input
              ref={inputRef}
              id="pf-avatar"
              type="file"
              accept="image/*"
              hidden
              onChange={handlePick}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              {t("profile.chooseImage")}
            </Button>
            <p className="sb-hint" style={{ marginTop: 8 }}>
              {file ? file.name : t("profile.imageHint")}
            </p>
          </div>
        </div>
        <Button type="submit" size="sm" isLoading={saving} disabled={!file}>
          {t("profile.updateAvatar")}
        </Button>
      </form>
    </section>
  );
}
