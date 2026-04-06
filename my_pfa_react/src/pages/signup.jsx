// src/pages/Signup.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Signup.css";
import validation from "./SignupValidation";
import { API_BASE } from "../api";

const pwRules = [
  { label: "8+ chars",    test: p => p.length >= 8 },
  { label: "Uppercase",   test: p => /[A-Z]/.test(p) },
  { label: "Number",      test: p => /[0-9]/.test(p) },
  { label: "Symbol",      test: p => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrengthBar({ password }) {
  const passed = pwRules.filter(r => r.test(password)).length;
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div className="pw-strength-wrap">
      <div className="pw-strength-bars">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="pw-strength-segment"
            style={{ background: i < passed ? colors[passed - 1] : "var(--border)" }}
          />
        ))}
      </div>
      <div className="pw-strength-meta">
        <span className="pw-strength-label" style={{ color: colors[passed - 1] || "var(--text-dim)" }}>
          {passed > 0 ? labels[passed - 1] : ""}
        </span>
        <div className="pw-strength-rules">
          {pwRules.map(r => (
            <span key={r.label} className={`pw-rule ${r.test(password) ? "pass" : ""}`}>
              {r.test(password) ? "✓" : "○"} {r.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPasswordStrength(password) {
  const passed = pwRules.filter(r => r.test(password)).length;
  if (passed <= 1) return { label: "Weak" };
  if (passed === 2) return { label: "Fair" };
  if (passed === 3) return { label: "Good" };
  return { label: "Strong" };
}

function Field({ label, name, type = "text", placeholder, values, errors, onChange }) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input
        type={type}
        name={name}
        value={values[name]}
        onChange={onChange}
        className={`form-control ${errors[name] ? "error" : ""}`}
        placeholder={placeholder}
        autoComplete={
          type === "password" ? "new-password" :
          type === "email" ? "email" : "off"
        }
      />
      {errors[name] && <span className="field-error">⚠ {errors[name]}</span>}
    </div>
  );
}

function SignupPage() {
  const [values, setValues] = useState({
    name: "", email: "", password: "",
    declination: "", azimuth: "",
    latitude: "", longitude: "", capacity: "",
  });

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const passwordStrength = getPasswordStrength(values.password);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (window.L) {
      setMapReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    const worldBounds = L.latLngBounds(
      L.latLng(-85, -180),
      L.latLng(85, 180)
    );

    const map = L.map(mapRef.current, {
      center: [48, 10],
      zoom: 4,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1,
      minZoom: 2
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap contributors © CARTO" }
    ).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;background:#FBB03B;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    map.on("click", (e) => {
      const lat = Math.max(-85, Math.min(85, e.latlng.lat));
      const lng = Math.max(-180, Math.min(180, e.latlng.lng));

      const rLat = Math.round(lat * 10000) / 10000;
      const rLng = Math.round(lng * 10000) / 10000;

      if (markerRef.current) markerRef.current.setLatLng([rLat, rLng]);
      else markerRef.current = L.marker([rLat, rLng], { icon }).addTo(map);

      setValues(prev => ({
        ...prev,
        latitude: String(rLat),
        longitude: String(rLng)
      }));
    });

    mapInstanceRef.current = map;
  }, [mapReady]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validation(values);
    setErrors(validationErrors);

    if (passwordStrength.label === "Weak" && values.password) {
      setGlobalError("Password is too weak");
      return;
    }

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/signup`, values);

      navigate("/User", {
        state: {
          userId: res.data.userId,
          ...values
        }
      });

    } catch (err) {
      setGlobalError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = { values, errors, onChange: handleInput };

  return (
    <div className="signup-page">
      <div className="signup-left">
        <div className="signup-brand">
          <div className="logo-mark">☀️</div>
          <h2>PVForecast</h2>
          <p>Your solar production intelligence platform</p>
        </div>

        <Link to="/" className="back-home-btn">← Back to Home</Link>
      </div>

      <div className="signup-right">

        <h1>Create your account</h1>

        {globalError && <div className="global-error">{globalError}</div>}

        <form onSubmit={handleSubmit}>

          <Field label="Full Name" name="name" {...fieldProps} />
          <Field label="Email Address" name="email" type="email" {...fieldProps} />

          <Field label="Password" name="password" type="password" {...fieldProps} />

          <PasswordStrengthBar password={values.password} />

          <Field label="Declination" name="declination" type="number" {...fieldProps} />
          <Field label="Azimuth" name="azimuth" type="number" {...fieldProps} />
          <Field label="Capacity (kWp)" name="capacity" type="number" {...fieldProps} />

          <div className="map-wrapper" ref={mapRef}></div>

          <Field label="Latitude" name="latitude" type="number" {...fieldProps} />
          <Field label="Longitude" name="longitude" type="number" {...fieldProps} />

          <button type="submit" className="submit-btn">
            {loading ? "Creating..." : "Create Account"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default SignupPage;