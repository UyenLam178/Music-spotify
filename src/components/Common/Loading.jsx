import { useTranslation } from "react-i18next";

export default function Loading({ full = false, label }) {
  const { t } = useTranslation();
  const displayLabel = label ?? t("common.loading");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        height: full ? "100%" : "auto",
        minHeight: full ? 300 : "auto",
        padding: 40,
        color: "var(--color-text-subdued)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.15)",
          borderTopColor: "var(--color-green)",
          animation: "mw-spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: 13 }}>{displayLabel}</span>
      <style>{`@keyframes mw-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
