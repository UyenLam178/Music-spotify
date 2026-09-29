import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as userService from "../../services/userService";
import { extractErrorMessage } from "../../services/api";
import Button from "../Common/Button";
import Field from "../Common/Field";
import Modal from "../Common/Modal";

// UC11 Vô hiệu hóa tài khoản -> DISABLED
// UC12 Xóa tài khoản         -> DELETED (xóa mềm)
// Cả hai: nhập mật khẩu hiện tại -> backend kiểm tra -> xác nhận -> thực hiện,
// rồi kết thúc phiên đăng nhập.
export default function AccountSection() {
  const { t } = useTranslation();
  const { endSession } = useAuth();
  const navigate = useNavigate();
  const [action, setAction] = useState(null); // "disable" | "delete" | null
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (a) => {
    setAction(a);
    setPassword("");
    setError("");
  };
  const close = () => {
    setAction(null);
    setPassword("");
    setError("");
  };

  const confirm = async () => {
    if (!password) {
      setError(t("validation.passwordRequired"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      const fn = action === "disable" ? userService.disableAccount : userService.deleteAccount;
      await fn({ currentPassword: password });
      // Token của tài khoản này không còn dùng được nữa -> chỉ cần xoá phía client
      endSession();
      navigate("/", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, t(`profile.${action}FailedDefault`)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="profile-section danger-zone">
        <h2>{t("profile.disableAccount")}</h2>
        <p className="sb-hint">{t("profile.disableWarning")}</p>
        <Button variant="outline" size="sm" onClick={() => open("disable")}>
          {t("profile.disableAccount")}
        </Button>
      </section>

      <section className="profile-section danger-zone">
        <h2>{t("profile.deleteAccount")}</h2>
        <p className="sb-hint">{t("profile.deleteWarning")}</p>
        <Button variant="outline" size="sm" onClick={() => open("delete")}>
          {t("profile.deleteAccount")}
        </Button>
      </section>

      <Modal
        isOpen={action !== null}
        onClose={close}
        title={action ? t(`profile.confirm${action === "disable" ? "Disable" : "Delete"}Title`) : ""}
      >
        {error && <div className="form-error-banner">{error}</div>}
        <p className="sb-hint" style={{ marginBottom: 16 }}>
          {action && t(`profile.${action}Warning`)}
        </p>
        <Field label={t("profile.enterPasswordConfirm")} htmlFor="pf-confirm-account-pw">
          <input
            id="pf-confirm-account-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="outline" size="sm" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" isLoading={busy} onClick={confirm}>
            {action && t(`profile.${action}Confirm`)}
          </Button>
        </div>
      </Modal>
    </>
  );
}
