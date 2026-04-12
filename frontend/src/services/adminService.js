const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/auth";

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

// ── All Users ──────────────────────────────────
export async function fetchAllUsers(token) {
  const res = await fetch(`${BASE}/users`, { headers: headers(token) });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch users");
  return res.json();
}

// ── Change Role ────────────────────────────────
export async function updateUserRole(token, userId, role) {
  const res = await fetch(`${BASE}/users/${userId}/role`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to update role");
  return res.json();
}

// ── Activate / Deactivate ──────────────────────
export async function updateUserStatus(token, userId, is_active) {
  const res = await fetch(`${BASE}/users/${userId}/status`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to update status");
  return res.json();
}

// ── Delete User ────────────────────────────────
export async function deleteUser(token, userId) {
  const res = await fetch(`${BASE}/users/${userId}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to delete user");
  return res.json();
}

// ── Login Sessions ─────────────────────────────
export async function fetchLoginSessions(token) {
  const res = await fetch(`${BASE}/login-sessions`, { headers: headers(token) });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch sessions");
  return res.json();
}

// ── Analyst History ────────────────────────────
export async function fetchAnalystHistory(token) {
  const res = await fetch(`${BASE}/analyst-history`, { headers: headers(token) });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch history");
  return res.json();
}

// ── Admin Stats ────────────────────────────────
export async function fetchAdminStats(token) {
  const res = await fetch(`${BASE}/admin-stats`, { headers: headers(token) });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch stats");
  return res.json();
}
