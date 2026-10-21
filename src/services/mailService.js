// ============================================================================
// Gửi email tự động từ frontend qua EmailJS (https://www.emailjs.com).
// Dùng để báo kết quả duyệt yêu cầu trở thành nghệ sĩ qua email.
//
// Cấu hình (.env):
//   VITE_EMAILJS_SERVICE_ID=...   (Email Services -> kết nối Gmail)
//   VITE_EMAILJS_TEMPLATE_ID=...  (Email Templates)
//   VITE_EMAILJS_PUBLIC_KEY=...   (Account -> API keys -> Public Key)
//
// Template EmailJS dùng các biến: {{to_email}} {{to_name}} {{subject}} {{message}}
//   - To Email của template đặt là {{to_email}}
//   - Subject của template đặt là {{subject}}
// Chưa cấu hình => bỏ qua, không gửi (không làm hỏng thao tác duyệt/từ chối).
// ============================================================================
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const isMailConfigured = () => !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

const send = async ({ toEmail, toName, subject, message }) => {
    if (!isMailConfigured()) return { sent: false, reason: "not-configured" };
    try {
        const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service_id: SERVICE_ID,
                template_id: TEMPLATE_ID,
                user_id: PUBLIC_KEY,
                template_params: { to_email: toEmail, to_name: toName, subject, message },
            }),
        });
        return { sent: res.ok };
    } catch {
        return { sent: false };
    }
};

// Mail báo kết quả duyệt yêu cầu trở thành nghệ sĩ. reason: lý do từ chối (tuỳ chọn)
export const sendArtistRequestResult = ({ user, approved, reason }) => {
    const name = user.artistName || user.username;
    const subject = approved
        ? "MySpotify - Yêu cầu nghệ sĩ đã được duyệt"
        : "MySpotify - Yêu cầu nghệ sĩ bị từ chối";
    const message = approved
        ? `Chúc mừng! Yêu cầu trở thành nghệ sĩ "${name}" của bạn đã được duyệt. ` +
          `Bạn có thể đăng nhập và thêm nhạc trong mục Quản lý nhạc.`
        : `Rất tiếc, yêu cầu trở thành nghệ sĩ "${name}" của bạn đã bị từ chối.` +
          (reason ? `\nLý do: ${reason}` : "") +
          `\nBạn có thể chỉnh sửa và gửi lại yêu cầu trong trang Tài khoản.`;
    return send({ toEmail: user.email, toName: user.fullName || user.username, subject, message });
};
