import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, navMessage } = useAuth();

  // Show loader during session init OR page navigation
  if (loading || navMessage) {
    return (
      <div className="loader-container">
        <div className="loader-brand">
          <div className="loader-brand-icon">
            <svg
              width="20"
              height="20"
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
          </div>
          <span className="loader-brand-name">
            Vehicle Intelligence Platform
          </span>
        </div>
        <div className="spinner" />
        <p className="loader-text">{navMessage || "Loading your session..."}</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Role check (wait until profile loaded)
  if (requiredRole && profile && profile.role !== requiredRole) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
