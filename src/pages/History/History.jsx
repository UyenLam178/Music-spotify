import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import * as songService from "../../services/songService";
import { extractErrorMessage } from "../../services/api";
import { IconPlay } from "../../components/Common/Icons";
import SongRow from "../../components/Music/SongRow";
import Loading from "../../components/Common/Loading";
import LoginPrompt from "../../components/Common/LoginPrompt";

// Nhóm theo ngày: Hôm nay / Hôm qua / ngày cụ thể
const dayKey = (iso) => {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export default function History() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { playQueue } = usePlayer();
  const [state, setState] = useState({ loading: true, songs: [], error: "" });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    songService
      .getRecentHistory()
      .then((songs) => !cancelled && setState({ loading: false, songs, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, songs: [], error: extractErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <LoginPrompt />;
  if (state.loading) return <Loading full />;

  const { songs } = state;
  const today = dayKey(new Date());
  const label = (iso) => {
    const k = dayKey(iso);
    if (k === today) return t("history.today");
    if (k === today - 86400000) return t("history.yesterday");
    return new Date(iso).toLocaleDateString();
  };

  const groups = [];
  songs.forEach((s, idx) => {
    const key = s.playedAt ? label(s.playedAt) : t("history.earlier");
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push({ s, idx });
    else groups.push({ key, items: [{ s, idx }] });
  });

  return (
    <div>
      <div className="section-head">
        <h1 style={{ fontSize: 28 }}>{t("history.title")}</h1>
        {songs.length > 0 && (
          <button className="btn-icon play-btn" onClick={() => playQueue(songs, 0)} aria-label={t("player.play")}>
            <IconPlay />
          </button>
        )}
      </div>
      <p className="sb-hint" style={{ marginBottom: 16 }}>{t("history.hint")}</p>

      {state.error && <p className="form-error-banner">{state.error}</p>}
      {!state.error && songs.length === 0 && <p className="sb-hint">{t("history.empty")}</p>}

      {groups.map((g) => (
        <section className="section" key={g.key}>
          <h3 className="history-day">{g.key}</h3>
          <div className="song-list">
            {g.items.map(({ s, idx }) => (
              <SongRow key={`${s.id}-${s.playedAt}`} song={s} index={idx} songList={songs} showPlays playedAt={s.playedAt} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
