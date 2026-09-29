import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import * as userService from "../services/userService";
import { tokenStorage } from "../services/api";

const AuthContext = createContext(null);

// user = User trả về từ GET /users/profile:
//   { id, username, email, fullName, avatarUrl, accountStatus, role,
//     artistRequestStatus, artistName, bio }
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Không có token thì không cần chờ backend => không hiện màn hình loading
  const [isLoading, setIsLoading] = useState(() => !!tokenStorage.getToken());

  // Có token trong localStorage -> hỏi backend "tôi là ai" để khôi phục phiên.
  const loadCurrentUser = useCallback(async () => {
    if (!tokenStorage.getToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await userService.getProfile());
    } catch (err) {
      const status = err?.response?.status;
      // Token sai/hết hạn (Spring Security có thể trả 401 hoặc 403) -> bỏ phiên.
      // Lỗi khác (mất mạng, 5xx) -> giữ token để người dùng thử lại sau.
      if (status === 401 || status === 403) tokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tokenStorage.getToken()) loadCurrentUser();
    const handleExpired = () => setUser(null);
    window.addEventListener("mw:auth-expired", handleExpired);
    return () => window.removeEventListener("mw:auth-expired", handleExpired);
  }, [loadCurrentUser]);

  // UC03: login -> lưu JWT -> tải hồ sơ đầy đủ
  const login = async (credentials) => {
    const res = await authService.login(credentials); // LoginResponse { token, userId, username, role }
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
  // Dùng sau khi vô hiệu hoá / xoá tài khoản, khi token không còn dùng được nữa.
  const endSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // UC06: báo backend đăng xuất; dù lỗi mạng vẫn phải xoá token ở client.
  const logout = async () => {
    try {
      await userService.logout();
    } catch {
      /* bỏ qua: JWT stateless, xoá token ở client là đủ */
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
