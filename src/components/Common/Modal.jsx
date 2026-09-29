import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function Modal({ isOpen, onClose, title, children, width = 420 }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--color-bg-elevated)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          className="btn-icon"
          style={{ position: "absolute", top: 12, right: 12 }}
          aria-label={t("common.close")}
        >
          ✕
        </button>
        {title && <h2 style={{ fontSize: 22, marginBottom: 20, paddingRight: 24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
