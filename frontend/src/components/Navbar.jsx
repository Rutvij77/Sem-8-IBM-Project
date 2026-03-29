import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

export default function Navbar() {
  const { profile, logout, startNavLoading, stopNavLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isDashboard = location.pathname === "/dashboard";

  const handleLogout = () => {
    startNavLoading("Logging you out...");
    setTimeout(() => {
      navigate("/");
      stopNavLoading();
      logout();
    }, 800);
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="brand">
          <svg
            className="brand-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Vehicle Intelligence Platform
        </div>

        <button
          className="dashboard-btn"
          onClick={() => {
            startNavLoading(
              isDashboard ? "Taking you home..." : "Loading Dashboard...",
            );
            setTimeout(() => {
              stopNavLoading();
              navigate(isDashboard ? "/home" : "/dashboard");
            }, 800);
          }}
        >
          {isDashboard ? (
            /* Home icon — shown on /dashboard */
            <>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </>
          ) : (
            /* Dashboard icon — shown on all other pages */
            <>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Dashboard
            </>
          )}
        </button>
      </div>

      <div className="nav-right">
        <div className="user-menu" onClick={() => setOpen(!open)}>
          <div className="user-avatar">
            {profile?.username ? profile.username[0].toUpperCase() : "U"}
          </div>
          <span className="user-name">
            {profile?.username ? profile.username.toUpperCase() : "USER"}
          </span>
          <svg
            className="chevron"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>

          {open && (
            <div className="dropdown">
              <button onClick={handleLogout}>
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
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
