import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/authService";
import { useState } from "react";
import "../styles/auth.css";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      email: e.target.email.value,
      password: e.target.password.value,
    };

    const result = await loginUser(payload);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
      return;
    }

    // just navigate — loading state already shows the screen above
    setTimeout(() => {
      navigate("/home");
    }, 1500);
  };

  if (loading) {
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
        <p className="loader-text">Logging you in...</p>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          Vehicle tracking and Speed Detection System
        </h1>
        <p className="auth-subtitle">Login to your account</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input type="email" name="email" placeholder="Email" required />

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              required
            />
            <span
              className={`password-icon ${showPassword ? "visible" : ""}`}
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Wait, redirecting..." : "Login"}
          </button>
          {loading && <div className="loading-bar"></div>}
        </form>

        <div className="auth-footer">
          <p>Don't have an account?</p>
          <Link to="/signup" className="secondary-btn">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
