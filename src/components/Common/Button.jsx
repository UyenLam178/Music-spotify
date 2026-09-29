import { useTranslation } from "react-i18next";

export default function Button({
  children,
  variant = "primary", // primary | outline | ghost
  size = "md", // md | sm
  isLoading = false,
  disabled = false,
  type = "button",
  className = "",
  ...rest
}) {
  const { t } = useTranslation();
  const classes = ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || isLoading} {...rest}>
      {isLoading ? t("common.processing") : children}
    </button>
  );
}
