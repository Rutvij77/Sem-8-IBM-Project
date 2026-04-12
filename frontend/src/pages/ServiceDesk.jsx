import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  fetchTickets, createTicket, editTicket, deleteTicket,
  changeTicketStatus, fetchTicketDetail, addComment, fetchAdmins
} from "../services/ticketService";
import { ToastContainer, useToast } from "../components/Toast";
import "../styles/servicedesk.css";

const PRIORITIES  = ["Low", "Medium", "High"];
const CATEGORIES  = ["General", "Speed Alert", "System", "Data", "Access", "Other"];
const STATUSES    = ["Open", "In Progress", "Resolved", "Closed"];
const EDITABLE_ST = ["Open", "In Progress"];

const priorityColor = { Low: "priority-low", Medium: "priority-medium", High: "priority-high" };
const statusColor   = { Open: "status-open", "In Progress": "status-inprogress", Resolved: "status-resolved", Closed: "status-closed" };

const EMPTY_FORM = { title: "", priority: "Medium", category: "General", description: "", assigned_to: "" };

export default function ServiceDesk() {
  const { session, profile } = useAuth();
  const token   = session?.access_token;
  const isAdmin = profile?.role === "admin";

  const [tickets, setTickets]       = useState([]);
  const [admins, setAdmins]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const { toasts, showToast, removeToast } = useToast();

  // Filters
  const [filterStatus, setFilterStatus] = useState("Active Only");
  const [filterPriority, setFilterPriority] = useState("All Priorities");
  const [filterCategory, setFilterCategory] = useState("All Categories");

  // View States
  const [viewState, setViewState] = useState("list"); // "list", "create", "detail"
  const [editMode, setEditMode]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  // Prompt dialog state (replaces window.prompt)
  const [promptDialog, setPromptDialog]   = useState(null);
  // { title, label, placeholder, required, onSubmit(text) }
  const [promptValue, setPromptValue]     = useState("");

  const openPrompt = (opts) => { setPromptDialog(opts); setPromptValue(""); };
  const closePrompt = () => { setPromptDialog(null); setPromptValue(""); };

  // Confirm dialog state (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState(null);
  // { title, message, confirmLabel, confirmClass, onConfirm }
  const openConfirm = (opts) => setConfirmDialog(opts);
  const closeConfirm = () => setConfirmDialog(null);

  // Detail view
  const [detail, setDetail]         = useState(null);  // { ticket, comments }
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  /* ── Initial load ── */
  useEffect(() => {
    if (!token) return;
    loadTickets();
    loadAdmins();
  }, [token]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchTickets(token);
      setTickets(data);
    } catch (e) {
      showToast(e.message || "Failed to load tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const data = await fetchAdmins(token);
      setAdmins(data);
    } catch (_) {}
  };

  const notify = (msg, type = "success") => showToast(msg, type);

  /* ── Form helpers ── */
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setEditId(null);
    setViewState("create");
  };

  const closeForm = () => {
    setViewState("list");
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.assigned_to) {
      notify("Please fill in the required fields", "info");
      return;
    }
    setFormLoading(true);
    try {
      if (editMode) {
        await editTicket(token, editId, form);
        notify("Ticket updated successfully");
      } else {
        await createTicket(token, form);
        notify("Ticket created successfully");
      }
      setViewState("list");
      await loadTickets();
    } catch (err) {
      notify(err.message || "Action failed", "error");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = (ticketId, title) => {
    openConfirm({
      title: "Delete Ticket",
      message: `Are you sure you want to permanently delete ticket "${title}"?`,
      confirmLabel: "Delete",
      confirmClass: "admin-submit-btn confirm-danger",
      onConfirm: async () => {
        try {
          await deleteTicket(token, ticketId);
          notify("Ticket deleted");
          setTickets(prev => prev.filter(t => t.id !== ticketId));
          if (detail?.ticket?.id === ticketId) setViewState("list");
        } catch (e) {
          notify(e.message || "Delete failed", "error");
        }
      },
    });
  };

  /* ── Status change ── */
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await changeTicketStatus(token, ticketId, newStatus);
      notify(`Status changed to "${newStatus}"`);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (detail?.ticket?.id === ticketId) {
        setDetail((prev) => ({ ...prev, ticket: { ...prev.ticket, status: newStatus } }));
      }
    } catch (e) {
      notify(e.message || "Status update failed", "error");
    }
  };

  // Generic assignment / priority update from the detail view
  const handleDetailUpdate = async (field, value) => {
    try {
      // Re-use editTicket for partial updates if your backend supports PATCH
      // Wait, our backend may expect full data or specific field. Let's just pass the field.
      // Assuming editTicket expects a partial body. Wait, editTicket sends JSON.stringify(formData). 
      // If it patches, sending just { [field]: value } should work.
      await editTicket(token, detail.ticket.id, { [field]: value });
      notify("Ticket updated");
      setTickets(prev => prev.map(t => t.id === detail.ticket.id ? { ...t, [field]: value } : t));
      setDetail((prev) => ({ ...prev, ticket: { ...prev.ticket, [field]: value } }));
    } catch(e) {
      notify("Failed to update ticket", "error");
    }
  };


  /* ── Ticket detail ── */
  const openDetail = async (ticketId) => {
    setViewState("detail");
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await fetchTicketDetail(token, ticketId);
      setDetail(data);
    } catch (e) {
      notify("Failed to load ticket details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setViewState("list");
  };

  /* ── Comment ── */
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await addComment(token, detail.ticket.id, commentText);
      setCommentText("");
      // Refresh detail
      const data = await fetchTicketDetail(token, detail.ticket.id);
      setDetail(data);
      notify("Comment added");
    } catch (e) {
      notify(e.message || "Failed to add comment", "error");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleStartWorking = async () => {
    try {
      await changeTicketStatus(token, detail.ticket.id, "In Progress");
      notify("Ticket is now In Progress");
      setTickets(prev => prev.map(t => t.id === detail.ticket.id ? { ...t, status: "In Progress" } : t));
      setDetail((prev) => ({ ...prev, ticket: { ...prev.ticket, status: "In Progress" } }));
    } catch (e) {
      notify(e.message || "Failed to start working", "error");
    }
  };

  const handleMarkFixed = () => {
    openPrompt({
      title: "Mark as Fixed",
      label: "Resolution comment (required)",
      placeholder: "Describe what was done to fix this issue...",
      required: true,
      onSubmit: async (comment) => {
        setCommentLoading(true);
        try {
          await addComment(token, detail.ticket.id, comment);
          await changeTicketStatus(token, detail.ticket.id, "Resolved");
          notify("Ticket marked as Resolved");
          setTickets(prev => prev.map(t => t.id === detail.ticket.id ? { ...t, status: "Resolved" } : t));
          const data = await fetchTicketDetail(token, detail.ticket.id);
          setDetail(data);
        } catch (e) {
          notify(e.message || "Failed to mark as fixed", "error");
        } finally {
          setCommentLoading(false);
        }
      },
    });
  };

  const handleAnalystFeedback = async (didFix) => {
    if (didFix) {
      openConfirm({
        title: "Close Ticket",
        message: "Are you sure this issue is completely resolved and you want to close it?",
        confirmLabel: "Close Ticket",
        confirmClass: "admin-submit-btn confirm-activate", // Matches green action style
        onConfirm: async () => {
          try {
            await changeTicketStatus(token, detail.ticket.id, "Closed");
            notify("Ticket Closed");
            setTickets(prev => prev.map(t => t.id === detail.ticket.id ? { ...t, status: "Closed" } : t));
            const data = await fetchTicketDetail(token, detail.ticket.id);
            setDetail(data);
          } catch (e) {
            notify(e.message || "Failed to close ticket", "error");
          }
        },
      });
    } else {
      // Reopen — ask for a reason via custom dialog
      openPrompt({
        title: "Reopen Ticket",
        label: "Why is this issue not fixed? (optional)",
        placeholder: "Describe what is still wrong...",
        required: false,
        onSubmit: async (comment) => {
          try {
            await changeTicketStatus(token, detail.ticket.id, "In Progress");
            if (comment.trim()) {
              await addComment(token, detail.ticket.id, comment);
            }
            notify("Ticket Reopened");
            setTickets(prev => prev.map(t => t.id === detail.ticket.id ? { ...t, status: "In Progress" } : t));
            const data = await fetchTicketDetail(token, detail.ticket.id);
            setDetail(data);
          } catch (e) {
            notify(e.message || "Failed to update ticket", "error");
          }
        },
      });
    }
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const clearFilters = () => {
    setFilterStatus("Active Only");
    setFilterPriority("All Priorities");
    setFilterCategory("All Categories");
  };

  const stats = {
    open: tickets.filter(t => t.status === "Open").length,
    inProgress: tickets.filter(t => t.status === "In Progress").length,
    resolved: tickets.filter(t => t.status === "Resolved").length,
    closed: tickets.filter(t => t.status === "Closed").length,
  };

  const filteredTickets = tickets
    .filter(t => {
      const matchStatus = filterStatus === "All Statuses" ? true :
                          filterStatus === "Active Only" ? (t.status === "Open" || t.status === "In Progress") :
                          t.status === filterStatus;
      const matchPriority = filterPriority === "All Priorities" || t.priority === filterPriority;
      const matchCategory = filterCategory === "All Categories" || t.category === filterCategory;
      return matchStatus && matchPriority && matchCategory;
    })
    .sort((a, b) => {
      // 1. Sort by Status
      const statusOrder = { "In Progress": 1, "Open": 2, "Resolved": 3, "Closed": 4 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // 2. Sort by Priority
      const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // 3. Fallback to newest created
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div className="sd-wrapper">
      <Navbar />

      <main className="sd-main">
        {/* ── Header ── */}
        <div className="sd-header">
          <div className="sd-title-wrap">
            <span className="sd-title-icon">🎫</span>
            <h1 className="sd-title">
              {viewState === "create" ? "Create New Ticket" : "Service Desk"}
            </h1>
            {viewState === "create" && (
              <p className="sd-subtitle-inline">Submit an issue, speed alert, or service request to the team.</p>
            )}
          </div>
          {viewState === "list" && (
            <div style={{display:'flex', gap:'10px'}}>
              <button 
                onClick={loadTickets} 
                style={{background:'none', border:'1px solid #e2e8f0', borderRadius:'5px', padding:'5px 10px', fontSize:'11.5px', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
              <button className="sd-new-btn" onClick={openCreate}>
                + New Ticket
              </button>
            </div>
          )}
          {viewState === "detail" && (
            <button className="sd-back-btn" onClick={closeDetail}>
              ← Back to Tickets
            </button>
          )}
        </div>

        {error && <div style={{display:'none'}}></div>}

        {/* ── LIST VIEW ── */}
        {viewState === "list" && (
          <div className="sd-list-view">
            {/* Stats Cards */}
            <div className="sd-stats-row">
              <div className="sd-stat-card border-open">
                <span className="sd-stat-label">OPEN</span>
                <span className="sd-stat-value text-blue">{stats.open}</span>
              </div>
              <div className="sd-stat-card border-inprogress">
                <span className="sd-stat-label">IN PROGRESS</span>
                <span className="sd-stat-value text-cyan">{stats.inProgress}</span>
              </div>
              <div className="sd-stat-card border-resolved">
                <span className="sd-stat-label">RESOLVED</span>
                <span className="sd-stat-value text-green">{stats.resolved}</span>
              </div>
              <div className="sd-stat-card border-closed">
                <span className="sd-stat-label">CLOSED</span>
                <span className="sd-stat-value text-gray">{stats.closed}</span>
              </div>
            </div>

            {/* Filters */}
            <div className="sd-filters">
              <select className="sd-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option>Active Only</option>
                <option>All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="sd-filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option>All Priorities</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="sd-filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option>All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="sd-clear-filters" onClick={clearFilters}>Clear filters</button>
            </div>

            {/* Content Table */}
            <div className="sd-content-box">
               <div className="sd-section-header">
                  <div className="sd-section-title-wrap">
                    <div className="sd-section-indicator"></div>
                    <h2 className="sd-section-title">TICKETS</h2>
                  </div>
                  <span className="sd-last-count">{filteredTickets.length} tickets</span>
               </div>
               
               <div className="sd-table-wrapper">
                 <table className="sd-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>TITLE</th>
                        <th>STATUS</th>
                        <th>PRIORITY</th>
                        <th>CATEGORY</th>
                        <th>OWNER</th>
                        <th>ASSIGNED</th>
                        <th>CREATED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={8} className="empty-row">Loading...</td></tr>
                      ) : filteredTickets.length === 0 ? (
                        <tr><td colSpan={8} className="empty-row">No tickets match the criteria.</td></tr>
                      ) : filteredTickets.map((t) => (
                        <tr key={t.id} onClick={() => openDetail(t.id)} className="clickable-row">
                          <td className="td-id">#{t.id.substring(0,4)}</td>
                          <td className="td-title">{t.title}</td>
                          <td><span className={`sd-pill ${statusColor[t.status]}`}>{t.status.toLowerCase()}</span></td>
                          <td><span className={`sd-pill ${priorityColor[t.priority]}`}>{t.priority.toLowerCase()}</span></td>
                          <td><span className="sd-pill category-pill">{t.category.toLowerCase()}</span></td>
                          <td className="td-owner">{t.created_by_profile?.username || "—"}</td>
                          <td className="td-assigned">{t.assigned_to_profile?.username || "—"}</td>
                          <td>{t.created_at ? t.created_at.substring(0, 10) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* ── CREATE / EDIT VIEW ── */}
        {viewState === "create" && (
          <div className="sd-create-view">
             <div className="sd-form-card">
               <form className="sd-modal-form" onSubmit={handleFormSubmit}>
                  <label className="sd-label">
                    TICKET TITLE *
                    <input
                      className="sd-input"
                      name="title"
                      value={form.title}
                      onChange={handleFormChange}
                      placeholder="Brief summary of the issue"
                      required
                    />
                  </label>

                  <div className="sd-form-row">
                    <label className="sd-label">
                      PRIORITY
                      <select className="sd-select" name="priority" value={form.priority} onChange={handleFormChange}>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </label>

                    <label className="sd-label">
                      CATEGORY
                      <select className="sd-select" name="category" value={form.category} onChange={handleFormChange}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="sd-label">
                    ASSIGNED TO *
                    <select className="sd-select" name="assigned_to" value={form.assigned_to} onChange={handleFormChange} required>
                      <option value="" disabled>— Select Admin —</option>
                      {admins.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                    </select>
                  </label>

                  <label className="sd-label">
                    DESCRIPTION *
                    <textarea
                      className="sd-textarea"
                      name="description"
                      value={form.description}
                      onChange={handleFormChange}
                      placeholder="Describe the issue in detail. Include what happened, when, and any relevant vehicle or location info."
                      rows={6}
                      required
                    />
                  </label>

                  <div className="sd-form-footer">
                    <button type="button" className="sd-cancel-link" onClick={closeForm}>
                      Cancel
                    </button>
                    <button type="submit" className="sd-submit-btn" disabled={formLoading}>
                      {formLoading ? "Submitting..." : (editMode ? "Update Ticket →" : "Submit Ticket →")}
                    </button>
                  </div>
               </form>
             </div>
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {viewState === "detail" && (
          <div className="sd-detail-view">
            {detailLoading ? (
               <div className="sd-loading"><div className="spinner" /><p>Loading details...</p></div>
            ) : detail ? (
              <div className="sd-detail-layout">
                
                {/* Detail Header area integrated directly in layout top */}
                <div className="sd-detail-top">
                  <div className="sd-detail-pills">
                    <span className="sd-pill id-pill">#{detail.ticket.id.substring(0,4)}</span>
                    <span className={`sd-pill ${statusColor[detail.ticket.status]}`}>{detail.ticket.status.toLowerCase()}</span>
                    <span className={`sd-pill ${priorityColor[detail.ticket.priority]}`}>{detail.ticket.priority.toLowerCase()}</span>
                    <span className="sd-pill category-pill">{detail.ticket.category}</span>
                  </div>
                  <h2 className="sd-detail-header-title">{detail.ticket.title}</h2>
                  <p className="sd-detail-meta">
                    Opened by <strong>{detail.ticket.created_by_profile?.username || "Unknown"}</strong> on {detail.ticket.created_at ? detail.ticket.created_at.substring(0,10) : "—"} · 
                    Assigned to <strong>{detail.ticket.assigned_to_profile?.username || "Unassigned"}</strong>
                  </p>
                </div>

                <div className="sd-detail-grid">
                   <div className="sd-detail-left">
                     {/* Description Box */}
                     <div className="sd-box">
                       <div className="sd-box-header">
                         <div className="sd-box-indicator"></div>
                         <h3>DESCRIPTION</h3>
                       </div>
                       <div className="sd-box-content">
                         <p>{detail.ticket.description}</p>
                       </div>
                     </div>

                     {/* Comments Box */}
                     <div className="sd-box">
                       <div className="sd-box-header">
                         <div className="sd-box-indicator"></div>
                         <h3>COMMENTS ({detail.comments.length})</h3>
                       </div>
                       <div className="sd-comments-area">
                         {detail.comments.length === 0 ? (
                           <p className="sd-no-comments">No comments yet — be the first to respond.</p>
                         ) : (
                           <div className="sd-comments-list">
                             {detail.comments.map(c => (
                               <div key={c.id} className="sd-comment">
                                  <div className="sd-comment-meta">
                                    <strong>{c.profiles?.username || "Unknown"}</strong>
                                    <span className="sd-comment-date">{formatDate(c.created_at)}</span>
                                  </div>
                                  <p>{c.comment}</p>
                               </div>
                             ))}
                           </div>
                         )}

                         {!['Resolved', 'Closed'].includes(detail.ticket.status) && (
                           <div className="sd-comment-input-wrap">
                             <textarea 
                               placeholder="Write a comment..."
                               value={commentText}
                               onChange={(e) => setCommentText(e.target.value)}
                               rows={4}
                             />
                             <button 
                               className="sd-post-comment-btn"
                               onClick={handleAddComment}
                               disabled={!commentText.trim() || commentLoading}
                             >
                               {commentLoading ? "Posting..." : "Post Comment"}
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>

                   <div className="sd-detail-right">
                      {/* Manage Ticket Box */}
                      <div className="sd-box manage-box">
                        <div className="sd-box-header">
                          <div className="sd-box-indicator bg-green"></div>
                          <h3>MANAGE TICKET</h3>
                        </div>
                        <div className="sd-manage-form">
                          <div className="sd-manage-status-display">
                            <label className="sd-label-small">CURRENT STATUS</label>
                            <span className={`sd-pill ${statusColor[detail.ticket.status]}`} style={{fontSize: '0.9rem', marginBottom: '15px', display: 'inline-block'}}>
                              {detail.ticket.status.toUpperCase()}
                            </span>
                          </div>

                          {/* Action Buttons based on Status and Role */}
                          {isAdmin && detail.ticket.status === "Open" && (
                            <button className="sd-submit-btn" style={{marginBottom: '15px'}} onClick={handleStartWorking}>
                              Start Working
                            </button>
                          )}
                          {isAdmin && detail.ticket.status === "In Progress" && (
                            <button className="sd-submit-btn" style={{marginBottom: '15px', backgroundColor: '#10b981'}} onClick={handleMarkFixed}>
                              Mark as Fixed
                            </button>
                          )}
                          {!isAdmin && detail.ticket.status === "Resolved" && (
                            <div className="sd-analyst-feedback-box" style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.1)'}}>
                              <p style={{marginTop: 0, fontWeight: 600, fontSize: '0.9rem'}}>Did this fix your issue?</p>
                              <div style={{display: 'flex', gap: '10px'}}>
                                <button className="sd-submit-btn" style={{padding: '8px', backgroundColor: '#10b981', flex: 1}} onClick={() => handleAnalystFeedback(true)}>
                                  Yes, close
                                </button>
                                <button type="button" className="sd-cancel-link" style={{padding: '8px', flex: 1, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f87171'}} onClick={() => handleAnalystFeedback(false)}>
                                  No, reopen
                                </button>
                              </div>
                            </div>
                          )}

                          <label className="sd-label-small">PRIORITY
                            <select 
                              className="sd-select" 
                              value={detail.ticket.priority} 
                              onChange={(e) => handleDetailUpdate("priority", e.target.value)}
                              disabled={['Resolved', 'Closed'].includes(detail.ticket.status)}
                            >
                              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </label>

                          <label className="sd-label-small">ASSIGNED TO
                            <select 
                              className="sd-select" 
                              value={detail.ticket.assigned_to || ""} 
                              onChange={(e) => handleDetailUpdate("assigned_to", e.target.value)}
                              disabled={['Resolved', 'Closed'].includes(detail.ticket.status)}
                            >
                              <option value="" disabled>— Select Admin —</option>
                              {admins.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                            </select>
                          </label>
                          
                          <div className="sd-manage-dates">
                            <div className="sd-date-row"><span>Created</span> <span>{detail.ticket.created_at ? detail.ticket.created_at.substring(0, 10) : "—"}</span></div>
                            <div className="sd-date-row"><span>Updated</span> <span>{detail.ticket.updated_at ? detail.ticket.updated_at.substring(0, 10) : "—"}</span></div>
                            <div className="sd-date-row"><span>Result Status</span> <span>{['Resolved', 'Closed'].includes(detail.ticket.status) ? "Yes" : "—"}</span></div>
                          </div>

                          {(isAdmin || detail.ticket.status === "Open") && (
                            <button className="sd-delete-btn" onClick={() => handleDelete(detail.ticket.id, detail.ticket.title)}>
                              Delete Ticket
                            </button>
                          )}
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>

      <Footer />
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* ── Prompt Dialog (replaces window.prompt) ── */}
      {promptDialog && (
        <div className="admin-modal-overlay" onClick={closePrompt}>
          <div className="admin-modal confirm-modal" style={{maxWidth: '480px'}} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{promptDialog.title}</h2>
              <button className="admin-modal-close" onClick={closePrompt}>✕</button>
            </div>
            <div className="confirm-modal-body">
              <label className="admin-label" style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                <span style={{fontSize:'12px', color:'#475569', fontWeight:600}}>{promptDialog.label}</span>
                <textarea
                  className="sd-comment-input-wrap"
                  style={{width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:'7px', fontSize:'13px', fontFamily:'Inter,sans-serif', color:'#1e293b', resize:'vertical', minHeight:'80px', boxSizing:'border-box'}}
                  placeholder={promptDialog.placeholder}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  autoFocus
                />
              </label>
            </div>
            <div className="admin-modal-footer confirm-modal-footer">
              <button className="admin-cancel-btn" onClick={closePrompt}>Cancel</button>
              <button
                className="admin-submit-btn"
                disabled={promptDialog.required && !promptValue.trim()}
                onClick={() => { promptDialog.onSubmit(promptValue); closePrompt(); }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog (replaces window.confirm) ── */}
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
                className={confirmDialog.confirmClass || "admin-submit-btn"}
                onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }}
              >
                {confirmDialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
