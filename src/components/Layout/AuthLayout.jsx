import { Outlet } from "react-router-dom";
import Footer from "./Footer";

// Khung cho các trang đăng nhập / đăng ký / OTP: nội dung + footer chú thích.
export default function AuthLayout() {
  return (
    <>
      <Outlet />
      <Footer className="auth-footer" />
    </>
  );
}
