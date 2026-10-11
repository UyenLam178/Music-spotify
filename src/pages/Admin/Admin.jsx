import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as adminService from "../../services/adminService";
import { extractErrorMessage, resolveAssetUrl } from "../../services/api";
import * as mailService from "../../services/mailService";
import * as genreService from "../../services/genreService";
import { Role, AccountStatus } from "../../utils/enums";
import Button from "../../components/Common/Button";
import Modal from "../../components/Common/Modal";
import Loading from "../../components/Common/Loading";
import StatusBanner from "../../components/Common/StatusBanner";

// Trang quản trị (chỉ ADMIN, xem App.jsx):
//   Tab "Người dùng"       : xem danh sách, khóa / mở khóa, gán vai trò   (getAllUsers, lock/unlockAccount, assignRole)
//   Quy tắc: ADMIN không thể đồng thời là ARTIST; ARTIST chỉ được cấp bằng cách duyệt yêu cầu.
//   Tab "Yêu cầu nghệ sĩ"  : xem yêu cầu chờ duyệt, duyệt / từ chối       (getPendingArtistRequests, approve/rejectArtistRequest)
export default function Admin() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  // Đổi tab thì xoá thông báo cũ (banner dùng chung cho mọi tab nên không tự mất)
  const switchTab = (id) => {
    setTab(id);
    setStatus({ type: "", message: "" });
  };
  const [genres, setGenres] = useState([]);
  const [genreForm, setGenreForm] = useState(null); // null | { id?, name, color }
  const [genreError, setGenreError] = useState("");
  const [songs, setSongs] = useState([]);
  const [songsUnavailable, setSongsUnavailable] = useState(false);
  const [rejectingSong, setRejectingSong] = useState(null);
  const [songReason, setSongReason] = useState("");
  const [rejecting, setRejecting] = useState(null); // user đang bị từ chối (mở modal nhập lý do)
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getPendingArtistRequests(),
      ]);
      setUsers(u);
      setRequests(r);
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err, t("admin.loadFailed")) });
    }
    setGenres(await genreService.getGenres());
    // Bài chờ duyệt: tải riêng để backend chưa có API này cũng không làm hỏng trang
    try {
      setSongs(await adminService.getPendingSongs());
      setSongsUnavailable(false);
    } catch {
      setSongs([]);
      setSongsUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => !cancelled && load());
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Gọi 1 hành động admin rồi tải lại dữ liệu để hiển thị đúng trạng thái backend
  const run = async (id, fn, successKey) => {
    setStatus({ type: "", message: "" });
    setBusyId(id);
    try {
      await fn();
      await load();
      setStatus({ type: "success", message: t(successKey) });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  // Hạ ARTIST xuống vai trò khác sẽ xóa hồ sơ nghệ sĩ (backend) -> hỏi xác nhận
  const changeRole = (u, role) => {
    if (u.role === Role.ARTIST && !window.confirm(t("admin.confirmDemote", { name: u.artistName || u.username }))) return;
    run(u.id, () => adminService.assignRole(u.id, role), "admin.roleAssigned");
  };

  // Duyệt / từ chối yêu cầu artist rồi tự động gửi mail báo kết quả cho user
  const decideRequest = async (u, approved, reasonText) => {
    setStatus({ type: "", message: "" });
    setBusyId(u.id);
    try {
      await (approved ? adminService.approveArtistRequest(u.id) : adminService.rejectArtistRequest(u.id));
      const mail = await mailService.sendArtistRequestResult({ user: u, approved, reason: reasonText });
      await load();
      const base = t(approved ? "admin.approved" : "admin.rejected");
      if (mail.sent) setStatus({ type: "success", message: `${base} ${t("admin.mailSent", { email: u.email })}` });
      else setStatus({ type: mail.reason === "not-configured" ? "success" : "error", message: `${base} ${t(mail.reason === "not-configured" ? "admin.mailNotConfigured" : "admin.mailFailed")}` });
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const saveGenre = async (e) => {
    e.preventDefault();
    const name = genreForm.name.trim();
    if (!name) return setGenreError(t("admin.genreNameRequired"));
    if (genres.some((g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== genreForm.id))
      return setGenreError(t("admin.genreDuplicate"));
    const payload = { name, color: genreForm.color };
    setGenreForm(null);
    await run(
      "genre",
      () => (genreForm.id ? genreService.updateGenre(genreForm.id, payload) : genreService.createGenre(payload)),
      "admin.genreSaved"
    );
  };

  const removeGenre = (g) => {
    if (!window.confirm(t("admin.genreConfirmDelete", { name: g.name }))) return;
    run(g.id, () => genreService.deleteGenre(g.id), "admin.genreDeleted");
  };

  const approveSong = (song) => run(song.id, () => adminService.approveSong(song.id), "admin.songApproved");

  const confirmRejectSong = async () => {
    if (!songReason.trim()) {
      setStatus({ type: "error", message: t("admin.songReasonRequired") });
      return;
    }
    const song = rejectingSong;
    const reasonText = songReason.trim();
    setRejectingSong(null);
    setSongReason("");
    await run(song.id, () => adminService.rejectSong(song.id, reasonText), "admin.songRejected");
  };

  const confirmReject = async () => {
    const u = rejecting;
    setRejecting(null);
    setReason("");
    await decideRequest(u, false, reason.trim());
  };

  if (loading) return <Loading full />;

  return (
    <div className="admin-page">
      <h1 className="playlist-header-title" style={{ fontSize: 40, marginBottom: 16 }}>
        {t("admin.title")}
      </h1>

      <div className="admin-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "users"}
          className={tab === "users" ? "active" : ""}
          onClick={() => switchTab("users")}
        >
          {t("admin.usersTab")} ({users.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "requests"}
          className={tab === "requests" ? "active" : ""}
          onClick={() => switchTab("requests")}
        >
          {t("admin.requestsTab")} ({requests.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "songs"}
          className={tab === "songs" ? "active" : ""}
          onClick={() => switchTab("songs")}
        >
          {t("admin.songsTab")} ({songs.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "genres"}
          className={tab === "genres" ? "active" : ""}
          onClick={() => switchTab("genres")}
        >
          {t("admin.genresTab")} ({genres.length})
        </button>
      </div>

      <StatusBanner status={status} />

      {tab === "users" && <p className="sb-hint admin-note">{t("admin.roleNote")}</p>}

      {tab === "users" ? (
        <div className="table-wrap">
          <table className="data-table" id="admin-users">
            <thead>
              <tr>
                <th>{t("admin.colUser")}</th>
                <th>{t("auth.emailLabel")}</th>
                <th>{t("admin.colStatus")}</th>
                <th>{t("admin.colRole")}</th>
                <th>{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === me?.id;
                const deleted = u.accountStatus === AccountStatus.DELETED;
                const unverified = u.accountStatus === AccountStatus.UNVERIFIED;
                const isAdminRow = u.role === Role.ADMIN;
                const locked = u.accountStatus === AccountStatus.DISABLED;
                const canLock = u.accountStatus === AccountStatus.ACTIVE;
                return (
                  <tr key={u.id} data-user={u.username}>
                    <td>
                      <strong>{u.username}</strong>
                      {u.fullName && <div className="sb-hint">{u.fullName}</div>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`status-pill status-${(u.accountStatus || "").toLowerCase()}`}>
                        {t(`accountStatus.${u.accountStatus}`, u.accountStatus)}
                      </span>
                    </td>
                    <td>
                      {isAdminRow ? (
                        // ADMIN không đổi được vai trò và không thể đồng thời là ARTIST
                        <span className="role-badge role-admin">{t("role.ADMIN")}</span>
                      ) : (
                        <select
                          aria-label={t("admin.colRole")}
                          value={u.role}
                          disabled={isMe || deleted || unverified || busyId === u.id}
                          onChange={(e) => changeRole(u, e.target.value)}
                        >
                          {Object.values(Role).map((r) => (
                            // ARTIST chỉ được cấp qua việc duyệt yêu cầu (backend từ chối gán trực tiếp)
                            <option key={r} value={r} disabled={r === Role.ARTIST && u.role !== Role.ARTIST}>
                              {t(`role.${r}`)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {!isMe && !isAdminRow && !deleted && (canLock || locked) && (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={busyId === u.id}
                          onClick={() =>
                            canLock
                              ? run(u.id, () => adminService.lockAccount(u.id), "admin.locked")
                              : run(u.id, () => adminService.unlockAccount(u.id), "admin.unlocked")
                          }
                        >
                          {canLock ? t("admin.lock") : t("admin.unlock")}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : tab === "genres" ? (
        <div>
          <div className="studio-head">
            <p className="sb-hint">{t("admin.genresHint")}</p>
            <Button onClick={() => { setGenreError(""); setGenreForm({ name: "", color: "#1db954" }); }}>
              + {t("admin.genreAdd")}
            </Button>
          </div>
          <div className="table-wrap">
            <table className="data-table" id="admin-genres">
              <thead>
                <tr>
                  <th>{t("admin.genreName")}</th>
                  <th>{t("admin.genreColor")}</th>
                  <th>{t("admin.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {genres.map((g) => (
                  <tr key={g.id} data-genre={g.name}>
                    <td><strong>{g.name}</strong></td>
                    <td><span className="genre-swatch" style={{ background: `#${g.color}` }} /> #{g.color}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button size="sm" variant="outline" onClick={() => { setGenreError(""); setGenreForm({ id: g.id, name: g.name, color: `#${g.color}` }); }}>
                          {t("common.edit")}
                        </Button>
                        <Button size="sm" variant="outline" isLoading={busyId === g.id} onClick={() => removeGenre(g)}>
                          {t("admin.genreDelete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "songs" ? (
        songsUnavailable ? (
          <div className="form-error-banner">{t("admin.songsUnavailable")}</div>
        ) : songs.length === 0 ? (
          <p className="sb-hint">{t("admin.noSongs")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="admin-songs">
              <thead>
                <tr>
                  <th>{t("admin.colSong")}</th>
                  <th>{t("admin.colArtist")}</th>
                  <th>{t("admin.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song) => (
                  <tr key={song.id} data-song={song.title}>
                    <td>
                      <div className="studio-song">
                        <div className="studio-cover">
                          {song.coverUrl ? <img src={resolveAssetUrl(song.coverUrl)} alt="" /> : <span>♪</span>}
                        </div>
                        <div>
                          <strong>{song.title}</strong>
                          {song.audioUrl && (
                            <audio controls preload="none" src={resolveAssetUrl(song.audioUrl)} style={{ display: "block", height: 32, marginTop: 6 }} />
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {song.artistName}
                      {song.featuredArtists?.length > 0 && (
                        <div className="sb-hint">feat. {song.featuredArtists.map((a) => a.artistName).join(", ")}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button size="sm" isLoading={busyId === song.id} onClick={() => approveSong(song)}>
                          {t("admin.songApprove")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === song.id} onClick={() => setRejectingSong(song)}>
                          {t("admin.songReject")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : requests.length === 0 ? (
        <p className="sb-hint">{t("admin.noRequests")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="admin-requests">
            <thead>
              <tr>
                <th>{t("admin.colUser")}</th>
                <th>{t("artistSection.nameLabel")}</th>
                <th>{t("artistSection.bioLabel")}</th>
                <th>{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((u) => (
                <tr key={u.id} data-user={u.username}>
                  <td>
                    <strong>{u.username}</strong>
                    <div className="sb-hint">{u.email}</div>
                  </td>
                  <td>{u.artistName}</td>
                  <td style={{ maxWidth: 320 }}>{u.bio}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        size="sm"
                        isLoading={busyId === u.id}
                        onClick={() => decideRequest(u, true)}
                      >
                        {t("admin.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === u.id}
                        onClick={() => setRejecting(u)}
                      >
                        {t("admin.reject")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title={t("admin.rejectTitle", { name: rejecting?.artistName || rejecting?.username })}
      >
        <p className="sb-hint" style={{ marginBottom: 12 }}>{t("admin.rejectHint", { email: rejecting?.email })}</p>
        <div className="field">
          <label htmlFor="reject-reason">{t("admin.reasonLabel")}</label>
          <textarea id="reject-reason" rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setRejecting(null)}>{t("common.cancel")}</Button>
          <Button onClick={confirmReject}>{t("admin.reject")}</Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!rejectingSong}
        onClose={() => setRejectingSong(null)}
        title={t("admin.songRejectTitle", { title: rejectingSong?.title })}
      >
        <div className="field">
          <label htmlFor="song-reject-reason">{t("admin.songReasonLabel")}</label>
          <textarea id="song-reject-reason" rows={3} maxLength={255} value={songReason} onChange={(e) => setSongReason(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setRejectingSong(null)}>{t("common.cancel")}</Button>
          <Button onClick={confirmRejectSong}>{t("admin.songReject")}</Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!genreForm}
        onClose={() => setGenreForm(null)}
        title={genreForm?.id ? t("admin.genreEdit") : t("admin.genreAdd")}
      >
        {genreForm && (
          <form onSubmit={saveGenre} noValidate>
            {genreError && <div className="form-error-banner">{genreError}</div>}
            <div className="field">
              <label htmlFor="genre-name">{t("admin.genreName")}</label>
              <input id="genre-name" maxLength={50} value={genreForm.name} onChange={(e) => setGenreForm({ ...genreForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="genre-color">{t("admin.genreColor")}</label>
              <input id="genre-color" type="color" value={genreForm.color} onChange={(e) => setGenreForm({ ...genreForm, color: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setGenreForm(null)}>{t("common.cancel")}</Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
