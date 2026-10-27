import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as adminService from "../../services/adminService";
import { extractErrorMessage } from "../../services/api";
import { Role, AccountStatus } from "../../utils/enums";
import Button from "../../components/Common/Button";
import Loading from "../../components/Common/Loading";
import StatusBanner from "../../components/Common/StatusBanner";
import SongModeration from "../../components/Admin/SongModeration";

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
  const [pendingSongs, setPendingSongs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  const load = useCallback(async () => {
    try {
      const [u, r, songs] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getPendingArtistRequests(),
        // Lấy sẵn số bài chờ duyệt để hiện trên tab "Duyệt nhạc" ngay khi vào trang (size=1 vì chỉ cần totalElements)
        adminService.getSongs({ status: "PENDING", size: 1 }).catch(() => null),
      ]);
      setUsers(u);
      setRequests(r);
      if (songs) setPendingSongs(songs.totalElements ?? 0);
    } catch (err) {
      setStatus({ type: "error", message: extractErrorMessage(err, t("admin.loadFailed")) });
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

  // Gọi 1 hành động admin rồi tải lại dữ liệu để hiển thị đúng trạng thái mới nhất
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

  // Hạ ARTIST xuống vai trò khác sẽ xóa hồ sơ nghệ sĩ -> hỏi xác nhận
  const changeRole = (u, role) => {
    if (u.role === Role.ARTIST && !window.confirm(t("admin.confirmDemote", { name: u.artistName || u.username }))) return;
    run(u.id, () => adminService.assignRole(u.id, role), "admin.roleAssigned");
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
          onClick={() => setTab("users")}
        >
          {t("admin.usersTab")} ({users.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "requests"}
          className={tab === "requests" ? "active" : ""}
          onClick={() => setTab("requests")}
        >
          {t("admin.requestsTab")} ({requests.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "songs"}
          className={tab === "songs" ? "active" : ""}
          onClick={() => setTab("songs")}
        >
          {t("adminSong.tab")}{pendingSongs != null ? ` (${pendingSongs})` : ""}
        </button>
      </div>

      <StatusBanner status={status} />

      {tab === "users" && <p className="sb-hint admin-note">{t("admin.roleNote")}</p>}

      {tab === "songs" ? (
        <SongModeration onPendingCount={setPendingSongs} />
      ) : tab === "users" ? (
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
                            // ARTIST chỉ được cấp qua việc duyệt yêu cầu (không gán trực tiếp được)
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
                        onClick={() => run(u.id, () => adminService.approveArtistRequest(u.id), "admin.approved")}
                      >
                        {t("admin.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === u.id}
                        onClick={() => window.confirm(t("admin.confirmReject", { name: u.artistName || u.username })) &&
                          run(u.id, () => adminService.rejectArtistRequest(u.id), "admin.rejected")}
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

    </div>
  );
}
