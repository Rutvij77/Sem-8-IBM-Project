const BASE = "http://localhost:5000/api/tickets";

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

// ── Fetch all tickets (analyst = own, admin = all) ──
export async function fetchTickets(token) {
  const res = await fetch(`${BASE}/`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch tickets");
  return res.json();
}

// ── Fetch single ticket + comments ─────────────────
export async function fetchTicketDetail(token, ticketId) {
  const res = await fetch(`${BASE}/${ticketId}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch ticket");
  return res.json(); // { ticket, comments }
}

// ── Create ticket ───────────────────────────────────
export async function createTicket(token, formData) {
  const res = await fetch(`${BASE}/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to create ticket");
  return res.json();
}

// ── Edit ticket ─────────────────────────────────────
export async function editTicket(token, ticketId, formData) {
  const res = await fetch(`${BASE}/${ticketId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to update ticket");
  return res.json();
}

// ── Delete ticket ───────────────────────────────────
export async function deleteTicket(token, ticketId) {
  const res = await fetch(`${BASE}/${ticketId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to delete ticket");
  return res.json();
}

// ── Change ticket status ────────────────────────────
export async function changeTicketStatus(token, ticketId, status) {
  const res = await fetch(`${BASE}/${ticketId}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to update status");
  return res.json();
}

// ── Add comment ─────────────────────────────────────
export async function addComment(token, ticketId, comment) {
  const res = await fetch(`${BASE}/${ticketId}/comments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to add comment");
  return res.json();
}

// ── Fetch admins list (for assign-to dropdown) ──────
export async function fetchAdmins(token) {
  const res = await fetch(`${BASE}/admins`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch admins");
  return res.json();
}
