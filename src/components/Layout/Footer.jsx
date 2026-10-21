import { useTranslation } from "react-i18next";

// Chú thích cuối trang: đây là đồ án học tập, không dùng cho mục đích thương mại.
export default function Footer({ className = "" }) {
  const { t } = useTranslation();
  return (
    <footer className={`app-footer ${className}`.trim()}>
      <p>{t("footer.disclaimer")}</p>
    </footer>
  );
}
