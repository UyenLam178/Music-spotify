// status = { type: "success" | "error" | "", message: string }
export default function StatusBanner({ status }) {
  if (!status?.message) return null;
  return (
    <div className={status.type === "error" ? "form-error-banner" : "form-success-banner"}>
      {status.message}
    </div>
  );
}
