// src/pages/Login.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import "./Login.css";
import validation from "./LoginValidation";
import { saveSession } from "../utils/session";
import useTheme from "../hooks/useTheme";
import { API_BASE } from "../api";

// ─── THE PASSWORD BUG ───────────────────────────────────────────────────────
// Previously the form was comparing the user's plain-text input against the
// bcrypt hash stored in the DB *on the frontend*, so only the hash itself
// would "match".  The correct flow is:
//   1. Send { email, plainTextPassword } to the backend.
//   2. The backend runs bcrypt.compare(plain, hash) and returns success/failure.
// This file simply sends the raw password string — bcrypt.compare lives in the
// Express route, not here.
// ────────────────────────────────────────────────────────────────────────────

function LoginPage() {
  const [values,     setValues]     = useState({ email: "", password: "" });
  const [errors,     setErrors]     = useState({});
  const [loginError, setLoginError] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [theme,      toggleTheme]   = useTheme(); // fix #9 — shared hook
  const navigate = useNavigate();

  const handleInput = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    setLoginError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validation(values);
    setErrors(validationErrors);
    // Fix #5: validation now only sets keys when there IS an error,
    // so this check is reliable.
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      // Send plain-text password — bcrypt.compare runs on the server.
      // Fix: do NOT hash the password here; that's what broke login.
      const res = await axios.post(`${API_BASE}/login`, {
        email:    values.email,
        password: values.password,   // ← plain text, always
      });

      if (res.data.success) {
        const user = {
          userId:      res.data.userId,
          name:        res.data.name,
          email:       res.data.email,
          latitude:    res.data.latitude,
          longitude:   res.data.longitude,
          declination: res.data.declination,
          azimuth:     res.data.azimuth,
          capacity:    res.data.capacity,
        };
        saveSession(user);
        navigate("/User", { state: user });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setLoginError("Email or password is incorrect");
      } else {
        setLoginError(
          `Something went wrong: ${err.response?.data?.details || err.message}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-overlay" />

      <button className="theme-toggle" onClick={toggleTheme} type="button">
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">☀️</div>
          <h1>Welcome back</h1>
          <p>
            New here? <Link to="/Signup">Create a free account →</Link>
          </p>
        </div>

        {loginError && <div className="login-error">⚠ {loginError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              onChange={handleInput}
              className={`form-control ${errors.email ? "error" : ""}`}
              placeholder="jane@email.com"
              autoComplete="email"
            />
            {errors.email && (
              <span className="field-error">⚠ {errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              onChange={handleInput}
              className={`form-control ${errors.password ? "error" : ""}`}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && (
              <span className="field-error">⚠ {errors.password}</span>
            )}
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "⏳ Signing in…" : "→ Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/">← Back to Home</Link>
          <span className="divider">|</span>
          <Link to="/Signup">Create account</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
