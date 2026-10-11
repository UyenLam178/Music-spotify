import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as notificationService from "../../services/notificationService";

const POLL_MS = 60000;

// Hòm thư: biểu tượng chuông + số thư chưa đọc + danh sách thư thả xuống.
export default function NotificationBell() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setItems(await notificationService.getNotifications(userId));
  }, [userId]);

  useEffect(() => {
    Promise.resolve().then(load);
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const read = async (n) => {
    if (n.read) return;
    try {
      await notificationService.markRead(n, userId);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      // Thư "được duyệt" -> role đã đổi, tải lại hồ sơ để hiện menu nghệ sĩ
      if (n.type === "ARTIST_REQUEST_APPROVED") refreshUser();
    } catch {
      /* bỏ qua */
    }
  };

  const readAll = async () => {
    try {
      await notificationService.markAllRead(items, userId);
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    } catch {
      /* bỏ qua */
    }
  };

  const title = (n) => n.title || t(`mailbox.types.${n.type}.title`, t("mailbox.defaultTitle"));
  const message = (n) => n.message || t(`mailbox.types.${n.type}.message`, "");

  return (
    <div className="mailbox" ref={ref}>
      <button className="btn-icon mailbox-btn" onClick={toggle} aria-label={t("mailbox.title")} title={t("mailbox.title")}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12 2a6 6 0 0 0-6 6v3.6L4.3 15.3A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.7L18 11.6V8a6 6 0 0 0-6-6m0 20a3 3 0 0 0 2.8-2H9.2A3 3 0 0 0 12 22" />
        </svg>
        {unread > 0 && <span className="mailbox-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="mailbox-panel">
          <div className="mailbox-head">
            <strong>{t("mailbox.title")}</strong>
            {unread > 0 && (
              <button type="button" onClick={readAll}>{t("mailbox.markAllRead")}</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="sb-hint" style={{ padding: 16 }}>{t("mailbox.empty")}</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className={n.read ? "" : "unread"}>
                  <button type="button" onClick={() => read(n)}>
                    <span className="mailbox-item-title">
                      {!n.read && <i className="mailbox-dot" />}
                      {title(n)}
                    </span>
                    <span className="mailbox-item-msg">{message(n)}</span>
                    {n.createdAt && (
                      <span className="sb-hint">{new Date(n.createdAt).toLocaleString()}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
