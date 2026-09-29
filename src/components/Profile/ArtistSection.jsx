import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as userService from "../../services/userService";
import { extractErrorMessage } from "../../services/api";
import { Role, ArtistRequestStatus } from "../../utils/enums";
import { validateArtistName, validateBio, LIMITS } from "../../utils/validators";
import Button from "../Common/Button";
import Field from "../Common/Field";
import StatusBanner from "../Common/StatusBanner";

// UC14 Yêu cầu trở thành nghệ sĩ   (role USER, artistRequestStatus NONE/REJECTED)
//      -> artistRequestStatus = PENDING, chờ Admin duyệt (UC17)
// UC19 Cập nhật hồ sơ nghệ sĩ      (role ARTIST): artistName, bio
// ADMIN không hiển thị mục này.
export default function ArtistSection() {
  const { t } = useTranslation();
  const { user, setUser, refreshUser } = useAuth();
  const isArtist = user?.role === Role.ARTIST;
  const requestStatus = user?.artistRequestStatus || ArtistRequestStatus.NONE;

  const [form, setForm] = useState({ artistName: user?.artistName || "", bio: user?.bio || "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  if (user?.role !== Role.USER && !isArtist) return null;

  const pending = !isArtist && requestStatus === ArtistRequestStatus.PENDING;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    const errs = {};
    const nameKey = validateArtistName(form.artistName);
    if (nameKey) errs.artistName = t(nameKey);
    const bioKey = validateBio(form.bio);
    if (bioKey) errs.bio = t(bioKey);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = { artistName: form.artistName.trim(), bio: form.bio.trim() };
    setBusy(true);
    try {
      if (isArtist) {
        const updated = await userService.updateArtistProfile(payload);
        setUser((prev) => ({ ...prev, ...payload, ...(updated || {}) }));
        setStatus({ type: "success", message: t("artistSection.updated") });
      } else {
        await userService.requestBecomeArtist(payload);
        // Lấy lại hồ sơ để có artistRequestStatus = PENDING từ backend
        await refreshUser();
        setStatus({ type: "success", message: t("artistSection.requestSent") });
      }
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-section">
      <h2>{isArtist ? t("artistSection.profileTitle") : t("artistSection.becomeTitle")}</h2>
      <StatusBanner status={status} />

      {!isArtist && requestStatus === ArtistRequestStatus.REJECTED && (
        <div className="form-error-banner">{t("artistSection.rejected")}</div>
      )}

      {pending ? (
        <p className="sb-hint">
          {t("artistSection.pending", { name: user?.artistName || form.artistName })}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {!isArtist && <p className="sb-hint" style={{ marginBottom: 12 }}>{t("artistSection.hint")}</p>}
          <Field label={t("artistSection.nameLabel")} htmlFor="pf-artist-name" error={errors.artistName}>
            <input
              id="pf-artist-name"
              maxLength={LIMITS.ARTIST_NAME_MAX}
              value={form.artistName}
              onChange={(e) => setForm({ ...form, artistName: e.target.value })}
            />
          </Field>
          <Field label={t("artistSection.bioLabel")} htmlFor="pf-artist-bio" error={errors.bio}>
            <textarea
              id="pf-artist-bio"
              rows={3}
              maxLength={LIMITS.BIO_MAX}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </Field>
          <Button type="submit" size="sm" isLoading={busy}>
            {isArtist ? t("artistSection.save") : t("artistSection.submitRequest")}
          </Button>
        </form>
      )}
    </section>
  );
}
