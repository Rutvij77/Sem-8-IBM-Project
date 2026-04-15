import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { fetchAllUsers, updateUserRole, updateUserStatus, deleteUser,
         fetchLoginSessions, fetchAnalystHistory, fetchAdminStats } from "../services/adminService";
import { ToastContainer, useToast } from "../components/Toast";
import "../styles/admin.css";

const TABS = ["Users", "Login Sessions", "Analysis History"];
const ITEMS_PER_PAGE = 10;

export default function AdminPanel() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [activeTab, setActiveTab] = useState("Users");
  const [users, setUsers]         = useState([]);
  const [sessions, setSessions]   = useState([]);
  const [history, setHistory]     = useState([]);
  const [stats, setStats]         = useState({ total_users: 0, admins: 0, analysts: 0, viewers: 0, analyses_run: 0 });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const { toasts, showToast, removeToast } = useToast();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [modalError, setModalError] = useState("");

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);
  // { title, message, confirmLabel, confirmClass, onConfirm }
  const openConfirm = (opts) => setConfirmDialog(opts);
  const closeConfirm = () => setConfirmDialog(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [tabCache, setTabCache] = useState({ Users: null, "Login Sessions": null, "Analysis History": null });

  /* ── Load stats once ── */
  useEffect(() => {
    if (!token) return;
    loadStats();
  }, [token]);

  const loadStats = async () => {
    try {
      const data = await fetchAdminStats(token);
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  };

  /* ── Reset page on tab change ── */
  useEffect(() => {
    setCurrentPage(1);
    if (token) loadTab(activeTab);
  }, [activeTab, token]);

  const loadTab = async (tab, force = false) => {
    if (!force && tabCache[tab]) {
      if (tab === "Users") setUsers(tabCache[tab]);
      else if (tab === "Login Sessions") setSessions(tabCache[tab]);
      else setHistory(tabCache[tab]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let data = [];
      if (tab === "Users") {
        data = await fetchAllUsers(token);
        setUsers(data);
      } else if (tab === "Login Sessions") {
        data = await fetchLoginSessions(token);
        setSessions(data);
      } else {
        data = await fetchAnalystHistory(token);
        setHistory(data);
      }
      setTabCache(prev => ({ ...prev, [tab]: data }));
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    loadStats();
    await loadTab(activeTab, true);
    notify("Data refreshed", "info");
  };

  const notify = (msg, type = "success") => showToast(msg, type);

  /* ── User Actions ── */
  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(token, userId, newRole.toLowerCase());
      notify(`Role updated to ${newRole}`);
      setUsers((prev) => {
        const updated = prev.map((u) => (u.id === userId ? { ...u, role: newRole.toLowerCase() } : u));
        setTabCache(c => ({...c, Users: updated}));
        return updated;
      });
      loadStats(); // Update stats
    } catch (e) {
      notify("Failed to update role", "error");
    }
  };

  const handleToggleStatus = (userId, currentStatus) => {
    const newStatus = !currentStatus;
    openConfirm({
      title: newStatus ? "Activate User" : "Deactivate User",
      message: newStatus
        ? "Are you sure you want to activate this user? They will be able to log in again."
        : "Are you sure you want to deactivate this user? They will no longer be able to log in.",
      confirmLabel: newStatus ? "Activate" : "Deactivate",
      confirmClass: newStatus ? "admin-submit-btn confirm-activate" : "admin-submit-btn confirm-deactivate",
      onConfirm: async () => {
        try {
          await updateUserStatus(token, userId, newStatus);
          notify(`User ${newStatus ? "activated" : "deactivated"}`);
          setUsers((prev) => {
            const updated = prev.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u));
            setTabCache(c => ({...c, Users: updated}));
            return updated;
          });
        } catch (e) {
          notify("Failed to update status", "error");
        }
      },
    });
  };

  const handleDelete = (userId, username) => {
    openConfirm({
      title: "Delete User",
      message: `Are you sure you want to permanently delete "${username}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      confirmClass: "admin-submit-btn confirm-danger",
      onConfirm: async () => {
        try {
          await deleteUser(token, userId);
          notify("User deleted");
          setUsers((prev) => {
            const updated = prev.filter((u) => u.id !== userId);
            setTabCache(c => ({...c, Users: updated}));
            return updated;
          });
          loadStats();
        } catch (e) {
          notify("Failed to delete user", "error");
        }
      },
    });
  };

  const [showModalPassword, setShowModalPassword] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setModalError("");
    const form = e.target;
    
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/auth/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: form.username.value,
          email: form.email.value,
          role: form.role.value
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite user");
      
      notify(data.message || "User invited successfully! An email has been sent to them.");
      setShowCreateUser(false);
      form.reset();
      loadTab("Users");
      loadStats();
    } catch (err) {
      setModalError(err.message);
      notify(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const formatDuration = (secs) => {
    if (secs == null) return "—";
    if (secs < 60) return `${parseFloat(secs).toFixed(1)}s`;
    return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  };

  /* ── Pagination Logic ── */
  const currentData = activeTab === "Users" ? users : activeTab === "Login Sessions" ? sessions : history;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const paginatedData = currentData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // max page buttons between first and last

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always include first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust window to always show at least 3 middle pages
      if (currentPage <= 3) {
        end = Math.min(maxVisible, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - maxVisible + 1);
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");

      // Always include last page
      pages.push(totalPages);
    }
    return pages;
  };

  const renderPagination = () => {
    return (
      <div className="pagination">
        <span className="pagination-info">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} entries
        </span>
        <div className="pagination-controls">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="page-btn">Prev</button>
          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`page-btn ${currentPage === page ? "active" : ""}`}
              >
                {page}
              </button>
            )
          )}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="page-btn">Next</button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-wrapper">
      <Navbar />

      <main className="admin-main">
        {/* ── Top Stats Dashboard ── */}
        <div className="admin-stats-row">
          <div className="stat-card">
            <span className="stat-label">TOTAL USERS</span>
            <span className="stat-value stat-blue">{stats.total_users}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">ADMINS</span>
            <span className="stat-value stat-purple">{stats.admins}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">ANALYSTS</span>
            <span className="stat-value stat-green">{stats.analysts}</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">ANALYSES RUN</span>
            <span className="stat-value stat-blue">{stats.analyses_run}</span>
          </div>
        </div>



        {/* ── Main Content Area ── */}
        <div className="admin-content-box">
          
          {/* ── Tabs ── */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid #e2e8f0', background: '#fff', paddingRight:'16px'}}>
            <div className="admin-tabs" style={{borderBottom:'none'}}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`admin-tab-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "Users" && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                  {tab === "Login Sessions" && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                  )}
                  {tab === "Analysis History" && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-5h2v5zm4 0h-2v-3h2v3zm0-5h-2v-2h2v2zm4 5h-2V7h2v10z"/>
                    </svg>
                  )}
                  {tab}
                </button>
              ))}
            </div>
            <button 
              onClick={handleRefresh}
              style={{background:'none', border:'1px solid #e2e8f0', borderRadius:'5px', padding:'5px 10px', fontSize:'11.5px', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh
            </button>
          </div>

          <div className="admin-inner-content">
            {/* ── Section Header ── */}
            <div className="section-header">
              <div className="section-title-wrap">
                <div className={`section-indicator ${activeTab.replace(' ', '-').toLowerCase()}`}></div>
                <h2 className="section-title">
                  {activeTab === "Users" ? "USER ACCOUNTS" : 
                   activeTab === "Login Sessions" ? "RECENT LOGIN SESSIONS" : "DETECTION ANALYSES"}
                </h2>
              </div>
              
              {activeTab === "Users" && (
                <button className="create-user-btn" onClick={() => setShowCreateUser(true)}>
                   + Create User
                </button>
              )}
              {activeTab !== "Users" && (
                <span className="last-count-text">Total {totalItems} records</span>
              )}
            </div>

            {/* ── Tab Content ── */}
            {loading ? (
              <div className="admin-loading">
                <div className="spinner" />
                <p>Loading...</p>
              </div>
            ) : (
              <>
                {/* ════════ TAB 1: USERS ════════ */}
                {activeTab === "Users" && (
                  <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>NAME</th>
                          <th>EMAIL</th>
                          <th>ROLE</th>
                          <th>STATUS</th>
                          <th>JOINED</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length === 0 ? (
                          <tr><td colSpan={7} className="empty-row">No users found</td></tr>
                        ) : paginatedData.map((u, idx) => (
                          <tr key={u.id}>
                            <td className="td-id">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                            <td className="td-username">{u.username}</td>
                            <td className="td-email">{u.email}</td>
                            <td>
                              <select
                                className="role-select"
                                value={u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : "Analyst"}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              >

                                <option value="Analyst">Analyst</option>
                                <option value="Admin">Admin</option>
                              </select>
                            </td>
                            <td>
                              <span className={`status-text ${u.is_active ? "text-active" : "text-inactive"}`}>
                                <span className="status-dot"></span>
                                {u.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>{u.created_at ? u.created_at.substring(0, 10) : "—"}</td>
                            <td className="td-actions-new">
                              <button
                                className={`action-link ${u.is_active ? "link-deactivate" : "link-activate"}`}
                                onClick={() => handleToggleStatus(u.id, u.is_active)}
                              >
                                {u.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="action-link link-delete"
                                onClick={() => handleDelete(u.id, u.username)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalItems > 0 && renderPagination()}
                  </>
                )}

                {/* ════════ TAB 2: LOGIN SESSIONS ════════ */}
                {activeTab === "Login Sessions" && (
                  <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>USER</th>
                          <th>EMAIL</th>
                          <th>IP ADDRESS</th>
                          <th>USER AGENT</th>
                          <th>LOGIN TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length === 0 ? (
                          <tr><td colSpan={5} className="empty-row">No sessions recorded yet</td></tr>
                        ) : paginatedData.map((s) => (
                          <tr key={s.id}>
                            <td className="td-username">{s.profiles?.username || "—"}</td>
                            <td className="td-email">{s.email}</td>
                            <td className="td-ip">{s.ip_address || "—"}</td>
                            <td className="td-agent" title={s.user_agent}>
                              {s.user_agent
                                ? s.user_agent.substring(0, 60) + (s.user_agent.length > 60 ? "…" : "")
                                : "—"}
                            </td>
                            <td>{formatDate(s.login_time)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalItems > 0 && renderPagination()}
                  </>
                )}

                {/* ════════ TAB 3: ANALYST HISTORY ════════ */}
                {activeTab === "Analysis History" && (
                  <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>USER</th>
                          <th>FILE</th>
                          <th>TOTAL</th>
                          <th>CARS</th>
                          <th>TRUCKS</th>
                          <th>BUSES</th>
                          <th>MOTO</th>
                          <th>DURATION</th>
                          <th>DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length === 0 ? (
                          <tr><td colSpan={9} className="empty-row">No analysis history yet</td></tr>
                        ) : paginatedData.map((h) => (
                          <tr key={h.id}>
                            <td className="td-username">{h.profiles?.username || "—"}</td>
                            <td className="td-filename" title={h.file_name}>
                              {h.file_name ? h.file_name.substring(0,40) + (h.file_name.length > 40 ? "..." : "") : "—"}
                            </td>
                            <td className="td-total">{h.total_vehicles}</td>
                            <td>{h.cars}</td>
                            <td>{h.trucks}</td>
                            <td>{h.buses}</td>
                            <td>{h.motorcycles}</td>
                            <td>{formatDuration(h.processing_duration)}</td>
                            <td>{h.created_at ? h.created_at.substring(0, 10) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalItems > 0 && renderPagination()}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {showCreateUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Create New User</h2>
              <button className="admin-modal-close" onClick={() => setShowCreateUser(false)}>✕</button>
            </div>
            {modalError && <div className="admin-error" style={{ margin: "0.75rem 1.25rem 0" }}>{modalError}</div>}
            <form className="admin-modal-form" onSubmit={handleCreateUser}>
              <div className="admin-form-group">
                <label className="admin-label">
                  <span className="admin-label-text">Username <span className="required">*</span></span>
                  <input type="text" className="admin-input" name="username" required placeholder="e.g. John Doe" />
                </label>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">
                  <span className="admin-label-text">Email <span className="required">*</span></span>
                  <input type="email" className="admin-input" name="email" required placeholder="john@example.com" />
                </label>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">
                  <span className="admin-label-text">Role <span className="required">*</span></span>
                  <select className="admin-select" name="role" required>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-cancel-btn" onClick={() => setShowCreateUser(false)}>Cancel</button>
                <button type="submit" className="admin-submit-btn" disabled={loading}>
                  {loading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      {confirmDialog && (
        <div className="admin-modal-overlay" onClick={closeConfirm}>
          <div className="admin-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{confirmDialog.title}</h2>
              <button className="admin-modal-close" onClick={closeConfirm}>✕</button>
            </div>
            <div className="confirm-modal-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="admin-modal-footer confirm-modal-footer">
              <button className="admin-cancel-btn" onClick={closeConfirm}>Cancel</button>
              <button
                className={confirmDialog.confirmClass}
                onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
