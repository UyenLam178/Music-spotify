import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MusicPlayer from "./MusicPlayer";

export default function MainLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main-col">
        <Header />
        <main className="app-content">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
      <div className="app-player-row">
        <MusicPlayer />
      </div>
    </div>
  );
}
