import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MusicPlayer from "./MusicPlayer";
import Footer from "./Footer";
import NowPlayingPanel from "./NowPlayingPanel";
import { usePlayer } from "../../context/PlayerContext";

export default function MainLayout() {
  // Trên điện thoại sidebar là ngăn kéo trượt ra từ bên trái
  const [menuOpen, setMenuOpen] = useState(false);
  const { panelOpen, currentSong } = usePlayer();
  const { pathname } = useLocation();
  const isHome = pathname === "/" || pathname.startsWith("/song/"); // trang ẩn thanh trượt
  const showPanel = panelOpen && !!currentSong;

  return (
    <div className={`app-shell${showPanel ? " has-panel" : ""}`}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className={`sidebar-backdrop${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(false)} />
      <div className="app-main-col">
        <Header onMenuClick={() => setMenuOpen(true)} />
        <main className={`app-content${isHome ? " no-scrollbar" : ""}`}>
          <div className="content-inner">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
      {showPanel && <NowPlayingPanel />}
      <div className="app-player-row">
        <MusicPlayer />
      </div>
    </div>
  );
}
