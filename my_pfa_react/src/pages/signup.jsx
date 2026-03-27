// src/pages/Signup.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import './Signup.css';
import validation from './SignupValidation';

// ─── Field must live OUTSIDE the parent component so it's never
//     re-created on each render (which caused the focus-loss bug).
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
          type === "email"    ? "email"        : "off"
        }
      />
      {errors[name] && <span className="field-error">⚠ {errors[name]}</span>}
    </div>
  );
}

let L = null;

function SignupPage() {
  const [values, setValues] = useState({
    name: "", email: "", password: "",
    declination: "", azimuth: "",
    latitude: "", longitude: "", capacity: "",
  });
  const [errors,      setErrors]      = useState({});
  const [globalError, setGlobalError] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [mapReady,    setMapReady]    = useState(false);

  const navigate        = useNavigate();
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markerRef       = useRef(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script   = document.createElement("script");
      script.src     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload  = () => { L = window.L; setMapReady(true); };
      document.head.appendChild(script);
    } else {
      L = window.L;
      if (L) setMapReady(true);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { center: [48, 10], zoom: 4 });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;background:#FBB03B;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(251,176,59,0.5);"></div>`,
      iconSize: [28, 28], iconAnchor: [14, 28],
    });

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const rLat = Math.round(lat * 10000) / 10000;
      const rLng = Math.round(lng * 10000) / 10000;
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      else markerRef.current = L.marker([lat, lng], { icon }).addTo(map);

      setValues(prev => ({ ...prev, latitude: String(rLat), longitude: String(rLng) }));
      setErrors(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
      setGlobalError("");
    });

    mapInstanceRef.current = map;
  }, [mapReady]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
    setGlobalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validation(values);
    setErrors(validationErrors);
    setGlobalError("");
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3001/signup", values);
      navigate("/User", {
        state: {
          userId: res.data.userId,
          name: values.name,
          latitude: values.latitude, longitude: values.longitude,
          declination: values.declination, azimuth: values.azimuth,
          capacity: values.capacity,
        },
      });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg) {
        if (msg.toLowerCase().includes("location")) setErrors(prev => ({ ...prev, latitude: msg }));
        else if (msg.toLowerCase().includes("email")) setErrors(prev => ({ ...prev, email: msg }));
        else setGlobalError(msg);
      } else {
        setGlobalError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Shared props for Field (avoids re-creating the component)
  const fieldProps = { values, errors, onChange: handleInput };

  return (
    <div className="signup-page">
      {/* LEFT PANEL */}
      <div className="signup-left">
        <div className="signup-brand">
          <div className="logo-mark">☀️</div>
          <h2>PVForecast</h2>
          <p>Your solar production intelligence platform</p>
        </div>
        <ul className="benefits-list">
          <li>
            <span className="icon">🗺️</span>
            <div>
              <strong>Map Location Picker</strong>
              <span>Click anywhere on the map to set your coordinates</span>
            </div>
          </li>
          <li>
            <span className="icon">📈</span>
            <div>
              <strong>48-hour Forecasts</strong>
              <span>Today &amp; tomorrow production curves</span>
            </div>
          </li>
          <li>
            <span className="icon">🔒</span>
            <div>
              <strong>Secure Account</strong>
              <span>Your data is encrypted and private</span>
            </div>
          </li>
        </ul>
        {/* Back home button */}
        <Link to="/" className="back-home-btn">← Back to Home</Link>
      </div>

      {/* RIGHT PANEL */}
      <div className="signup-right">
        <h1>Create your account</h1>
        <p className="subtitle">
          Already have one? <Link to="/Login">Sign in →</Link>
        </p>

        {globalError && <div className="global-error">⚠ {globalError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* ACCOUNT */}
          <div className="form-section">
            <div className="form-section-title">👤 Account Details</div>
            <Field label="Full Name"             name="name"     placeholder="Jane Doe"         {...fieldProps} />
            <Field label="Email Address"         name="email"    type="email" placeholder="jane@email.com" {...fieldProps} />
            <Field label="Password (min. 6 chars)" name="password" type="password" placeholder="••••••••"   {...fieldProps} />
          </div>

          {/* PV SYSTEM */}
          <div className="form-section">
            <div className="form-section-title">⚡ PV System Configuration</div>
            <div className="form-row">
              <Field label="Declination (0–90°)"  name="declination" type="number" placeholder="e.g. 35"         {...fieldProps} />
              <Field label="Azimuth (-180–180°)"  name="azimuth"     type="number" placeholder="e.g. 0 (South)"  {...fieldProps} />
            </div>
            <Field label="System Capacity (kWp)" name="capacity" type="number" placeholder="e.g. 5.5" {...fieldProps} />
          </div>

          {/* LOCATION */}
          <div className="form-section">
            <div className="form-section-title">📍 Installation Location</div>
            <p className="map-hint">🖱 Click on the map to set your panel's location</p>

            <div className="map-wrapper" ref={mapRef}>
              {!mapReady && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Loading map…
                </div>
              )}
            </div>

            <div className="coords-display">
              <div className="coord-pill">
                <label>Latitude</label>
                <span>{values.latitude || "—"}</span>
              </div>
              <div className="coord-pill">
                <label>Longitude</label>
                <span>{values.longitude || "—"}</span>
              </div>
            </div>

            {(errors.latitude || errors.longitude) && (
              <div className="field-error" style={{ marginBottom: 12 }}>
                ⚠ {errors.latitude || errors.longitude}
              </div>
            )}

            <p className="map-hint" style={{ marginTop: 4 }}>
              💡 Or enter coordinates manually below
            </p>
            <div className="form-row">
              <Field label="Latitude"  name="latitude"  type="number" placeholder="e.g. 48.8566" {...fieldProps} />
              <Field label="Longitude" name="longitude" type="number" placeholder="e.g. 2.3522"  {...fieldProps} />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "⏳ Creating account…" : "🚀 Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignupPage;
