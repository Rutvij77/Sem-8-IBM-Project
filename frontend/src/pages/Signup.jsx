import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../services/authService";
import { useState } from "react";
import "../styles/auth.css";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const payload = {
      username: e.target.username.value,
      email: e.target.email.value,
      password: e.target.password.value,
    };

    const result = await signupUser(payload);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
      return;
    }

    if (result.needsVerification) {
      setSuccessMessage(result.message);
      setLoading(false);
      return;
    }

    setSuccessMessage("Registration successful! Please confirm your email.");
    setLoading(false);

    setTimeout(() => {
      navigate("/");
    }, 5000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          Vehicle tracking and Speed Detection System
        </h1>
        <p className="auth-subtitle">Create a new account</p>

        {error && <div className="error-box">{error}</div>}
        {successMessage && <div className="success-box">{successMessage}</div>}

        <form onSubmit={handleSubmit}>
          <input type="text" name="username" placeholder="Username" required />

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

          <div className="password-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              required
            />
            <span
              className={`password-icon ${showConfirmPassword ? "visible" : ""}`}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
          {loading && <div className="loading-bar"></div>}
        </form>

        <div className="auth-footer">
          <p>Already have an account?</p>
          <Link to="/" className="secondary-btn">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
