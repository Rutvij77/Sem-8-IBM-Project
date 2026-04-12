import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

export default function Navbar({ onDashboardClick }) {
  const { profile, logout, startNavLoading, stopNavLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isAdmin       = profile?.role === "admin";
  const isOnDashboard = location.pathname === "/dashboard";
  const isOnVideoPlayer = location.pathname === "/videoplayer";
  const isOnAdmin     = location.pathname === "/admin";
  const isOnServiceDesk = location.pathname === "/servicedesk";

  const navTo = (path, message) => {
    startNavLoading(message);
    setTimeout(() => {
      stopNavLoading();
      navigate(path);
    }, 800);
  };

  const handleLogout = () => {
    startNavLoading("Logging you out...");
    setTimeout(() => {
      logout();
      stopNavLoading();
      navigate("/");
    }, 800);
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        {/* Brand */}
        <div className="brand">
          <svg className="brand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Vehicle Intelligence Platform
        </div>

        {/* ── Nav Buttons ── */}
        <>
          {/* Home */}
          <button
            className={`dashboard-btn ${location.pathname === "/home" ? "active-nav-btn" : ""}`}
            onClick={() => navTo("/home", "Taking you home...")}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>

          {/* Dashboard */}
          <button
            className={`dashboard-btn ${isOnDashboard ? "active-nav-btn" : ""}`}
            onClick={async () => {
              if (onDashboardClick) await onDashboardClick();
              navTo("/dashboard", "Loading Dashboard...");
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dashboard
          </button>

          {/* Video Player button */}
          <button
            className={`dashboard-btn ${isOnVideoPlayer ? "active-nav-btn" : ""}`}
            onClick={() => navTo("/videoplayer", "Loading Video Player...")}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video Player
          </button>

          {/* Service Desk — both roles */}
          <button
            className={`dashboard-btn ${isOnServiceDesk ? "active-nav-btn" : ""}`}
            onClick={() => navTo("/servicedesk", "Loading Service Desk...")}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Service Desk
          </button>

          {/* Admin Panel — admin only */}
          {isAdmin && (
            <button
              className={`dashboard-btn admin-nav-btn ${isOnAdmin ? "active-nav-btn" : ""}`}
              onClick={() => navTo("/admin", "Loading Admin Panel...")}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Admin Panel
            </button>
          )}
        </>
      </div>

      {/* Right — user menu */}
      <div className="nav-right">
        <div className="user-menu" onClick={() => setOpen(!open)}>
          <div className="user-avatar">
            {profile?.username ? profile.username[0].toUpperCase() : "U"}
          </div>
          <span className="user-name">
            {profile?.username ? profile.username.toUpperCase() : "USER"}
          </span>
          {/* Role badge */}
          {profile?.role && (
            <span className={`role-badge ${profile.role === "admin" ? "badge-admin" : "badge-analyst"}`}>
              {profile.role === "admin" ? "Admin" : "Analyst"}
            </span>
          )}
          <svg className="chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>

          {open && (
            <div className="dropdown">
              <button onClick={handleLogout}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
