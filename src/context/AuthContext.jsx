import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import * as userService from "../services/userService";
import { tokenStorage } from "../services/api";
import { getTokenExpiryMs } from "../utils/jwt";
import { isIdleExpired, touchActivity } from "../services/session";

// Quá 7 ngày không dùng web -> xoá phiên (người dùng phải đăng nhập lại)
const dropSessionIfIdle = () => {
  if (tokenStorage.getToken() && isIdleExpired()) {
    tokenStorage.clear();
    return true;
  }
  return false;
};

const AuthContext = createContext(null);

// user = User trả về từ GET /users/profile:
//   { id, username, email, fullName, avatarUrl, accountStatus, role,
//     artistRequestStatus, artistName, bio }
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Không có token thì không cần chờ => không hiện màn hình loading
  const [isLoading, setIsLoading] = useState(() => {
    dropSessionIfIdle();
    return !!tokenStorage.getToken();
  });

  // Có token trong localStorage -> lấy lại hồ sơ để khôi phục phiên.
  const loadCurrentUser = useCallback(async () => {
    if (!tokenStorage.getToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await userService.getProfile());
    } catch (err) {
      const status = err?.response?.status;
      // Token sai/hết hạn -> bỏ phiên.
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

  // Ghi nhận hoạt động để làm mới mốc 7 ngày; quay lại tab sau thời gian dài thì kiểm tra lại.
  useEffect(() => {
    if (!user) return undefined;
    const onActivity = () => touchActivity();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (dropSessionIfIdle()) setUser(null);
      else touchActivity();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  // Hẹn giờ tự đăng xuất đúng lúc JWT hết hạn (không phải đợi request kế tiếp bị 401).
  // Phụ thuộc vào `user`: login/logout thì token đổi nên hẹn lại.
  useEffect(() => {
    const token = tokenStorage.getToken();
    const expMs = token ? getTokenExpiryMs(token) : null;
    if (!user || expMs === null) return undefined;
    // setTimeout tối đa ~24.8 ngày; chặn để tránh tràn số
    const delay = Math.min(Math.max(expMs - Date.now(), 0), 2 ** 31 - 1);
    const id = setTimeout(() => {
      tokenStorage.clear();
      setUser(null);
    }, delay);
    return () => clearTimeout(id);
  }, [user]);

  // UC03: login -> lưu JWT -> tải hồ sơ đầy đủ
  const login = async (credentials) => {
    const res = await authService.login(credentials); // { token, userId, username, role }
    try {
      setUser(await userService.getProfile());
    } catch {
      // Không lấy được hồ sơ thì vẫn dùng thông tin tối thiểu từ kết quả đăng nhập
      setUser({ id: res.userId, username: res.username, role: res.role });
    }
    return res;
  };

  // UC01: đăng ký xong CHƯA đăng nhập, phải xác thực OTP (UC02) rồi mới login.
  const register = (payload) => authService.register(payload);

  // Xoá phiên trên máy này.
  // Dùng sau khi vô hiệu hoá / xoá tài khoản, khi token không còn dùng được nữa.
  const endSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // UC06: đăng xuất; dù lỗi mạng vẫn phải xoá phiên trên máy này.
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
