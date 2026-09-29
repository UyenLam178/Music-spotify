import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "../Common/Loading";

// roles (tuỳ chọn): danh sách Role được phép vào, vd roles={[Role.ADMIN]}.
// Đăng nhập rồi nhưng không đủ quyền -> về trang chủ.
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Loading full />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}
