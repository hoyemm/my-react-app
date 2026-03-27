// src/pages/Login.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import './Login.css';
import validation from './LoginValidation';
import axios from 'axios';

function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("pvf-theme") || "dark"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pvf-theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));
  return [theme, toggle];
}

function LoginPage() {
  const [values, setValues]         = useState({ email: "", password: "" });
  const [errors, setErrors]         = useState({});
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading]       = useState(false);
  const [theme, toggleTheme]        = useTheme();
  const navigate = useNavigate();

  const handleInput = (e) => {
    setValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: "" }));
    setLoginError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validation(values);
    setErrors(validationErrors);
    if (validationErrors.email || validationErrors.password) return;

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3001/login", values);
      if (res.data.success) {
        navigate("/User", {
          state: {
            userId: res.data.userId,
            name: res.data.name,
            latitude: res.data.latitude,
            longitude: res.data.longitude,
            declination: res.data.declination,
            azimuth: res.data.azimuth,
            capacity: res.data.capacity,
          },
        });
      }
    } catch (err) {
      if (err.response?.status === 401) setLoginError("Email or password is incorrect");
      else setLoginError("Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* theme toggle top-right */}
      <button className="login-theme-toggle" onClick={toggleTheme} type="button">
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">☀️</div>
          <h1>Welcome back</h1>
          <p>New here? <Link to="/Signup">Create a free account →</Link></p>
        </div>

        {loginError && <div className="login-error">⚠ {loginError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email" name="email"
              onChange={handleInput}
              className={`form-control ${errors.email ? "error" : ""}`}
              placeholder="jane@email.com"
              autoComplete="email"
            />
            {errors.email && <span className="field-error">⚠ {errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password" name="password"
              onChange={handleInput}
              className={`form-control ${errors.password ? "error" : ""}`}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && <span className="field-error">⚠ {errors.password}</span>}
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
