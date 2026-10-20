import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as songService from "../../services/songService";
import { extractErrorMessage } from "../../services/api";
import SongCard from "../../components/Music/SongCard";
import ArtistCard from "../../components/Music/ArtistCard";
import Loading from "../../components/Common/Loading";
import LoginPrompt from "../../components/Common/LoginPrompt";

export default function Home() {
    const { t } = useTranslation();
    const { user, isAuthenticated } = useAuth();
    const [state, setState] = useState({ loading: true, data: null, error: "" });

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return t("home.greetingMorning");
        if (h < 18) return t("home.greetingAfternoon");
        return t("home.greetingEvening");
    };

    useEffect(() => {
        if (!isAuthenticated) return undefined;
        let cancelled = false;
        // Lịch sử nghe là chức năng phụ: lỗi thì bỏ qua, không làm hỏng trang chủ
        Promise.all([songService.getHomeData(), songService.getRecentHistory().catch(() => [])])
            .then(([home, recent]) => !cancelled && setState({ loading: false, data: { ...home, recent }, error: "" }))
            .catch((err) => !cancelled && setState({ loading: false, data: null, error: extractErrorMessage(err) }));
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    if (!isAuthenticated) return <LoginPrompt />;
    if (state.loading) return <Loading full />;
    if (state.error) return <p className="form-error-banner">{state.error}</p>;

    const { newest, trending, artists, recent } = state.data;
    const empty = !newest.length;

    return (
        <div>
            <h1 style={{ fontSize: 28, marginBottom: 24 }}>
                {greeting()}{user ? `, ${user.fullName || user.username}` : ""}
            </h1>

            {empty && <p className="sb-hint">{t("home.noSongs")}</p>}

            {recent.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("home.recentlyPlayed")}</h2>
                    </div>
                    <div className="card-grid">
                        {recent.map((song) => (
                            <SongCard key={song.id} song={song} songList={recent} />
                        ))}
                    </div>
                </section>
            )}

            {newest.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("home.newReleases")}</h2>
                    </div>
                    <div className="card-grid">
                        {newest.map((song) => (
                            <SongCard key={song.id} song={song} songList={newest} />
                        ))}
                    </div>
                </section>
            )}

            {trending.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("home.trendingSongs")}</h2>
                    </div>
                    <div className="card-grid">
                        {trending.map((song) => (
                            <SongCard key={song.id} song={song} songList={trending} />
                        ))}
                    </div>
                </section>
            )}

            {artists.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("home.featuredArtists")}</h2>
                    </div>
                    <div className="circle-grid">
                        {artists.map((artist) => (
                            <ArtistCard key={artist.id} artist={artist} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
