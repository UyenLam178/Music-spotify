// Ô nhập liệu có nhãn + thông báo lỗi, dùng chung cho các form trong trang Hồ sơ.
export default function Field({ label, error, htmlFor, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
