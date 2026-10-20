import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as adminService from "../../services/adminService";
import { toListenerSong } from "../../services/songService";
import { usePlayer } from "../../context/PlayerContext";
import { IconPlay, IconPause } from "../Common/Icons";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import { SongStatus } from "../../utils/enums";
import { formatDate, formatDuration } from "../../utils/studio";
import Button from "../Common/Button";
import Field from "../Common/Field";
import Loading from "../Common/Loading";
import Modal from "../Common/Modal";
import StatusBanner from "../Common/StatusBanner";

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "DELETED", "ALL"];
const MAX_REASON = 255;

// Kiểm duyệt bài hát (UC34–UC36): duyệt / từ chối bài chờ duyệt, gỡ bài đã duyệt.
export default function SongModeration({ onPendingCount }) {
  const { t } = useTranslation();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const [filter, setFilter] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [reasonModal, setReasonModal] = useState(null); // { kind: "reject" | "remove", song }
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await adminService.getSongs({ status: filter === "ALL" ? undefined : filter, page });
      setData(res);
      if (filter === "PENDING") onPendingCount?.(res.totalElements);
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err, t("adminSong.loadFailed")) });
    } finally {
      setLoading(false);
    }
  }, [filter, page, onPendingCount, t]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => !cancelled && load());
    return () => {
      cancelled = true;
    };
  }, [load]);

  const changeFilter = (f) => {
    setLoading(true);
    setPage(0);
    setFilter(f);
  };

  const run = async (song, fn, successKey) => {
    setStatus({ type: "", message: "" });
    setBusyId(song.id);
    try {
      await fn();
      setReasonModal(null);
      await load();
      setStatus({ type: "success", message: t(successKey, { title: song.title }) });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const openReason = (kind, song) => {
    setReason("");
    setReasonError("");
    setReasonModal({ kind, song });
  };

  const submitReason = () => {
    const text = reason.trim();
    if (!text) return setReasonError(t("adminSong.reasonRequired"));
    if (text.length > MAX_REASON) return setReasonError(t("adminSong.reasonLength", { max: MAX_REASON }));
    const { kind, song } = reasonModal;
    run(
      song,
      () => (kind === "reject" ? adminService.rejectSong(song.id, text) : adminService.removeSong(song.id, text)),
      kind === "reject" ? "adminSong.rejected" : "adminSong.removed"
    );
  };

  const songs = data?.content || [];

  // Bấm ảnh bìa để nghe thử bằng player chính (bài chưa duyệt vẫn nghe được qua /uploads)
  const preview = (s) => {
    if (currentSong?.id === s.id) togglePlay();
    else playSong(toListenerSong(s));
  };

  return (
    <div>
      <div className="admin-tabs" role="tablist" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? "active" : ""} onClick={() => changeFilter(f)}>
            {t(`adminSong.filter.${f}`)}
          </button>
        ))}
      </div>

      <StatusBanner status={status} />

      {loading ? (
        <Loading />
      ) : songs.length === 0 ? (
        <p className="sb-hint">{t("adminSong.empty")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="admin-songs">
            <thead>
              <tr>
                <th>{t("studio.colSong")}</th>
                <th>{t("adminSong.colArtist")}</th>
                <th>{t("studio.colStatus")}</th>
                <th>{t("studio.colRelease")}</th>
                <th>{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s) => {
                const busy = busyId === s.id;
                const state = s.status === SongStatus.APPROVED ? (s.released ? "released" : "scheduled") : (s.status || "").toLowerCase();
                const feat = (s.featuredArtists || []).map((a) => a.artistName).join(", ");
                return (
                  <tr key={s.id} data-song={s.title}>
                    <td>
                      <div className="studio-song">
                        <button
                          type="button"
                          className="studio-cover preview-cover"
                          title={t("adminSong.preview")}
                          aria-label={t("adminSong.preview")}
                          disabled={s.status === SongStatus.DELETED}
                          onClick={() => preview(s)}
                        >
                          {s.coverUrl ? <img src={resolveAssetUrl(s.coverUrl)} alt="" /> : <span>♪</span>}
                          {s.status !== SongStatus.DELETED && (
                            <span className="preview-cover-icon">
                              {currentSong?.id === s.id && isPlaying ? <IconPause /> : <IconPlay />}
                            </span>
                          )}
                        </button>
                        <div>
                          <strong>{s.title}</strong>
                          <div className="sb-hint">{formatDuration(s.durationSeconds)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.artistName}
                      {feat && <div className="sb-hint">feat. {feat}</div>}
                    </td>
                    <td>
                      <span className={`status-pill song-${state}`}>{t(`studio.state.${state}`, state)}</span>
                      {s.rejectReason && s.status === SongStatus.REJECTED && (
                        <div className="sb-hint" style={{ maxWidth: 220 }}>{t("studio.rejectReason")}: {s.rejectReason}</div>
                      )}
                    </td>
                    <td>{s.releaseAt ? formatDate(s.releaseAt) : "—"}</td>
                    <td>
                      <div className="studio-actions">
                        {s.status === SongStatus.PENDING && (
                          <>
                            <Button size="sm" isLoading={busy} onClick={() => run(s, () => adminService.approveSong(s.id), "adminSong.approved")}>
                              {t("admin.approve")}
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => openReason("reject", s)}>
                              {t("admin.reject")}
                            </Button>
                          </>
                        )}
                        {(s.status === SongStatus.APPROVED || s.status === SongStatus.HIDDEN) && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => openReason("remove", s)}>
                            {t("adminSong.remove")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
          <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>‹</Button>
          <span className="sb-hint">{t("adminSong.page", { page: page + 1, total: data.totalPages })}</span>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>›</Button>
        </div>
      )}

      {reasonModal && (
        <Modal
          isOpen
          onClose={() => setReasonModal(null)}
          title={t(reasonModal.kind === "reject" ? "adminSong.rejectTitle" : "adminSong.removeTitle", { title: reasonModal.song.title })}
          width={460}
        >
          <Field label={t("adminSong.reasonLabel")} htmlFor="sm-reason" error={reasonError}>
            <textarea id="sm-reason" rows={3} maxLength={MAX_REASON} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <p className="sb-hint">{t("adminSong.reasonHint")}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <Button variant="outline" onClick={() => setReasonModal(null)}>{t("common.cancel")}</Button>
            <Button isLoading={busyId === reasonModal.song.id} onClick={submitReason}>
              {t(reasonModal.kind === "reject" ? "admin.reject" : "adminSong.remove")}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
