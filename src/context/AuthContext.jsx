import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import * as userService from "../services/userService";

const AuthContext = createContext(null);

// user = User trả về từ GET /users/profile:
//   { id, username, email, fullName, avatarUrl, accountStatus, role,
//     artistRequestStatus, artistName, bio }
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Không đọc được cookie HttpOnly nên không biết đã đăng nhập hay chưa:
  // luôn hỏi backend 1 lần lúc mở web (cookie tự được gửi kèm).
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    try {
      setUser(await userService.getProfile());
    } catch {
      // 401/403 = chưa đăng nhập hoặc cookie hết hạn; lỗi khác cũng coi như chưa có phiên.
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    userService
      .getProfile()
      .then((u) => alive && setUser(u))
      .catch(() => {})
      .finally(() => alive && setIsLoading(false));
    const handleExpired = () => setUser(null);
    window.addEventListener("mw:auth-expired", handleExpired);
    return () => {
      alive = false;
      window.removeEventListener("mw:auth-expired", handleExpired);
    };
  }, []);

  // UC03: login -> backend set cookie -> tải hồ sơ đầy đủ
  const login = async (credentials) => {
    const res = await authService.login(credentials); // LoginResponse { userId, username, role } + cookie HttpOnly
    try {
      setUser(await userService.getProfile());
    } catch {
      // Không lấy được hồ sơ thì vẫn dùng thông tin tối thiểu từ LoginResponse
      setUser({ id: res.userId, username: res.username, role: res.role });
    }
    return res;
  };

  // UC01: đăng ký xong CHƯA đăng nhập, phải xác thực OTP (UC02) rồi mới login.
  const register = (payload) => authService.register(payload);

  // Xoá phiên ở phía client (không gọi backend).
  // Dùng sau khi vô hiệu hoá / xoá tài khoản, khi cookie không còn dùng được nữa.
  const endSession = useCallback(() => setUser(null), []);

  // UC06: báo backend đăng xuất -> backend xoá cookie (Set-Cookie Max-Age=0).
  // Dù lỗi mạng vẫn đưa UI về trạng thái chưa đăng nhập.
  const logout = async () => {
    try {
      await userService.logout();
    } catch {
      /* bỏ qua */
    } finally {
      endSession();
    }
  };

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    endSession,
    refreshUser: loadCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong AuthProvider");
  return ctx;
};
