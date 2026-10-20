import { useState } from "react";
import { useTranslation } from "react-i18next";
import { extractErrorMessage } from "../../services/api";
import { GENRE_PALETTE, normalizeHex, normalizeText } from "../../services/genreService";
import { MAX_GENRE_NAME } from "../../utils/studio";
import { IconCheck } from "../Common/Icons";
import Button from "../Common/Button";
import Field from "../Common/Field";
import Modal from "../Common/Modal";
import StatusBanner from "../Common/StatusBanner";

// Thêm thể loại gồm 2 giai đoạn:
//   "form"    : nhập tên + chọn màu (bảng màu có sẵn hoặc màu tùy chọn) + xem trước
//   "confirm" : hỏi lại "Chọn màu này cho thể loại ...?" → Xác nhận mới tạo
export default function GenreModal({ existing, onClose, onCreate }) {
  const { t } = useTranslation();
  const [stage, setStage] = useState("form");
  const [name, setName] = useState("");
  const [color, setColor] = useState(GENRE_PALETTE[0]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  const hex = normalizeHex(color);
  const trimmed = name.trim();

  const goConfirm = () => {
    if (!trimmed) return setError(t("adminGenre.nameRequired"));
    if (existing.some((g) => normalizeText(g.name) === normalizeText(trimmed)))
      return setError(t("adminGenre.nameExists"));
    setError("");
    setStatus({ type: "", message: "" });
    setStage("confirm");
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await onCreate({ name: trimmed, color: hex });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
      setStage("form");
    } finally {
      setBusy(false);
    }
  };

  const preview = (
    <div className="genre-tile genre-preview" style={{ background: `#${hex}` }}>
      {trimmed || t("adminGenre.previewName")}
    </div>
  );

  return (
    <Modal isOpen onClose={busy ? undefined : onClose} title={t("adminGenre.addTitle")} width={480}>
      <StatusBanner status={status} />

      {stage === "form" ? (
        <>
          <Field label={t("adminGenre.nameLabel")} htmlFor="gn-name" error={error}>
            <input
              id="gn-name"
              maxLength={MAX_GENRE_NAME}
              value={name}
              placeholder={t("adminGenre.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div className="field">
            <label id="gn-color-label">{t("adminGenre.colorLabel")}</label>
            <div className="gn-palette" role="radiogroup" aria-labelledby="gn-color-label">
              {GENRE_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c === hex}
                  aria-label={`#${c}`}
                  className={`gn-swatch${c === hex ? " selected" : ""}`}
                  style={{ background: `#${c}` }}
                  onClick={() => setColor(c)}
                >
                  {c === hex && <IconCheck />}
                </button>
              ))}
            </div>
            <label className="gn-custom">
              <span className="sb-hint">{t("adminGenre.customColor")}</span>
              <input type="color" value={`#${hex.toLowerCase()}`} onChange={(e) => setColor(e.target.value)} />
              <code>#{hex}</code>
            </label>
          </div>

          <div className="field">
            <label>{t("adminGenre.preview")}</label>
            {preview}
          </div>

          <div className="wz-footer">
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={goConfirm}>{t("adminGenre.confirmColor")}</Button>
          </div>
        </>
      ) : (
        <>
          {preview}
          <p className="gn-confirm-text">{t("adminGenre.confirmText", { name: trimmed, color: `#${hex}` })}</p>
          <div className="wz-footer">
            <Button variant="outline" disabled={busy} onClick={() => setStage("form")}>
              {t("adminGenre.pickAgain")}
            </Button>
            <Button isLoading={busy} onClick={confirm}>{t("adminGenre.confirm")}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
