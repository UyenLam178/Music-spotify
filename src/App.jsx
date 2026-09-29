import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import MainLayout from "./components/Layout/MainLayout";
import ProtectedRoute from "./components/Common/ProtectedRoute";

import Home from "./pages/Home/Home";
import Search from "./pages/Search/Search";
import Library from "./pages/Library/Library";
import Playlist from "./pages/Playlist/Playlist";
import Album from "./pages/Album/Album";
import Artist from "./pages/Artist/Artist";
import Profile from "./pages/Profile/Profile";
import Admin from "./pages/Admin/Admin";
import { Role } from "./utils/enums";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import VerifyOtp from "./pages/VerifyOtp/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import NotFound from "./pages/NotFound/NotFound";

import "./index.css";
import "./App.css";

function App() {
  return (
      <BrowserRouter>
        <AuthProvider>
          <PlayerProvider>
            <Routes>
              {/* Trang xác thực - không dùng MainLayout (không có sidebar/player) */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Các trang chính - dùng chung MainLayout kiểu Spotify */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/library" element={<Library />} />
                <Route path="/playlist/:id" element={<Playlist />} />
                <Route path="/album/:id" element={<Album />} />
                <Route path="/artist/:id" element={<Artist />} />
                <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                      <ProtectedRoute roles={[Role.ADMIN]}>
                        <Admin />
                      </ProtectedRoute>
                    }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </PlayerProvider>
        </AuthProvider>
      </BrowserRouter>
  );
}

export default App;
