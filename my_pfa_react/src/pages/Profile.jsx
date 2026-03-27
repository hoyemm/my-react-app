// src/pages/Profile.jsx
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Profile.css";

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

let L = null;

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();

  const existing = location.state || {};
  const [values, setValues] = useState({
    name:        existing.name        || "",
    email:       existing.email       || "",
    password:    "",
    declination: existing.declination || "",
    azimuth:     existing.azimuth     || "",
    latitude:    existing.latitude    || "",
    longitude:   existing.longitude   || "",
    capacity:    existing.capacity    || "",
  });
  const [errors,      setErrors]      = useState({});
  const [globalError, setGlobalError] = useState("");
  const [success,     setSuccess]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [mapReady,    setMapReady]    = useState(false);
  const [activeTab,   setActiveTab]   = useState("account");

  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef      = useRef(null);

  // Load Leaflet
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script  = document.createElement("script");
      script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => { L = window.L; setMapReady(true); };
      document.head.appendChild(script);
    } else {
      L = window.L;
      if (L) setMapReady(true);
    }
  }, []);

  // Init map when location tab is active
  useEffect(() => {
    if (activeTab !== "location") return;
    if (!mapReady) return;
    // small delay so the tab panel has rendered
    const t = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const initLat = parseFloat(values.latitude) || 36;
      const initLng = parseFloat(values.longitude) || 10;

      const map = L.map(mapRef.current, { center: [initLat, initLng], zoom: 6 });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd", maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;background:#FBB03B;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(251,176,59,0.5);"></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28],
      });

      // Place existing marker
      if (values.latitude && values.longitude) {
        markerRef.current = L.marker([initLat, initLng], { icon }).addTo(map);
      }

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        const rLat = Math.round(lat * 10000) / 10000;
        const rLng = Math.round(lng * 10000) / 10000;
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        setValues(prev => ({ ...prev, latitude: String(rLat), longitude: String(rLng) }));
        setErrors(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
      });

      mapInstanceRef.current = map;
    }, 80);
    return () => clearTimeout(t);
  }, [activeTab, mapReady]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
    setGlobalError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setSuccess("");

    // Basic validation
    const errs = {};
    if (!values.name.trim())  errs.name  = "Name is required";
    if (!values.email.trim()) errs.email = "Email is required";
    if (values.password && values.password.length < 6) errs.password = "Password must be at least 6 characters";
    const dec = parseFloat(values.declination);
    const az  = parseFloat(values.azimuth);
    const cap = parseFloat(values.capacity);
    if (isNaN(dec) || dec < 0 || dec > 90)    errs.declination = "Must be 0–90°";
    if (isNaN(az)  || az < -180 || az > 180)  errs.azimuth     = "Must be -180–180°";
    if (isNaN(cap) || cap <= 0)                errs.capacity    = "Must be a positive number";
    if (!values.latitude || !values.longitude) errs.latitude    = "Please set a location on the map";

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = { ...values };
      if (!payload.password) delete payload.password; // don't send empty password
      await axios.put(`http://localhost:3001/users/${existing.userId}`, payload);
      setSuccess("Profile updated successfully!");
      // Navigate back to dashboard with updated state
      setTimeout(() => {
        navigate("/User", {
          state: {
            userId:      existing.userId,
            name:        values.name,
            latitude:    values.latitude,
            longitude:   values.longitude,
            declination: values.declination,
            azimuth:     values.azimuth,
            capacity:    values.capacity,
          }
        });
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.error;
      setGlobalError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initials = values.name
    ? values.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const tabs = [
    { id: "account",  label: "👤 Account",  },
    { id: "system",   label: "⚡ PV System", },
    { id: "location", label: "📍 Location",  },
  ];

  return (
    <div className="profile-page">
      {/* TOPBAR */}
      <header className="profile-topbar">
        <div className="profile-topbar-left">
          <span className="topbar-logo">☀️ PVForecast</span>
          <div className="topbar-divider" />
          <span className="topbar-title">Edit Profile</span>
        </div>
        <div className="profile-topbar-right">
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button
            className="profile-back-btn"
            onClick={() => navigate("/User", { state: existing })}
            type="button"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="profile-content">
        {/* SIDEBAR */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-block">
            <div className="profile-avatar-lg">{initials}</div>
            <div className="profile-avatar-name">{values.name || "Your Name"}</div>
            <div className="profile-avatar-sub">PVForecast Member</div>
          </div>

          <nav className="profile-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`profile-nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="profile-system-summary">
            <div className="pss-label">Current System</div>
            {[
              ["📍", `${existing.latitude || "—"}°, ${existing.longitude || "—"}°`],
              ["↕️", `Declination ${existing.declination || "—"}°`],
              ["↔️", `Azimuth ${existing.azimuth || "—"}°`],
              ["🔋", `${existing.capacity || "—"} kWp`],
            ].map(([icon, text]) => (
              <div className="pss-row" key={text}>
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN FORM */}
        <main className="profile-main">
          {globalError && (
            <div className="profile-alert error">⚠ {globalError}</div>
          )}
          {success && (
            <div className="profile-alert success">✓ {success}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ── ACCOUNT TAB ── */}
            {activeTab === "account" && (
              <div className="profile-section">
                <div className="profile-section-title">👤 Account Details</div>
                <p className="profile-section-sub">Update your name, email, or password.</p>

                <div className="pf-group">
                  <label>Full Name</label>
                  <input
                    name="name" value={values.name}
                    onChange={handleInput}
                    className={errors.name ? "error" : ""}
                    placeholder="Jane Doe"
                  />
                  {errors.name && <span className="pf-error">⚠ {errors.name}</span>}
                </div>

                <div className="pf-group">
                  <label>Email Address</label>
                  <input
                    type="email" name="email" value={values.email}
                    onChange={handleInput}
                    className={errors.email ? "error" : ""}
                    placeholder="jane@email.com"
                  />
                  {errors.email && <span className="pf-error">⚠ {errors.email}</span>}
                </div>

                <div className="pf-group">
                  <label>New Password <span className="pf-optional">(leave blank to keep current)</span></label>
                  <input
                    type="password" name="password" value={values.password}
                    onChange={handleInput}
                    className={errors.password ? "error" : ""}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  {errors.password && <span className="pf-error">⚠ {errors.password}</span>}
                </div>
              </div>
            )}

            {/* ── SYSTEM TAB ── */}
            {activeTab === "system" && (
              <div className="profile-section">
                <div className="profile-section-title">⚡ PV System Configuration</div>
                <p className="profile-section-sub">Adjust your panel parameters to fine-tune forecast accuracy.</p>

                <div className="pf-row">
                  <div className="pf-group">
                    <label>Declination (0–90°)</label>
                    <input
                      type="number" name="declination" value={values.declination}
                      onChange={handleInput}
                      className={errors.declination ? "error" : ""}
                      placeholder="e.g. 35"
                    />
                    {errors.declination && <span className="pf-error">⚠ {errors.declination}</span>}
                  </div>
                  <div className="pf-group">
                    <label>Azimuth (-180–180°)</label>
                    <input
                      type="number" name="azimuth" value={values.azimuth}
                      onChange={handleInput}
                      className={errors.azimuth ? "error" : ""}
                      placeholder="e.g. 0 (South)"
                    />
                    {errors.azimuth && <span className="pf-error">⚠ {errors.azimuth}</span>}
                  </div>
                </div>

                <div className="pf-group">
                  <label>System Capacity (kWp)</label>
                  <input
                    type="number" name="capacity" value={values.capacity}
                    onChange={handleInput}
                    className={errors.capacity ? "error" : ""}
                    placeholder="e.g. 5.5"
                  />
                  {errors.capacity && <span className="pf-error">⚠ {errors.capacity}</span>}
                </div>

                <div className="pf-info-card">
                  <div className="pf-info-title">💡 Tips</div>
                  <ul>
                    <li><strong>Declination</strong> — angle of panels from horizontal (0° = flat, 90° = vertical)</li>
                    <li><strong>Azimuth</strong> — compass direction panels face (0° = South, -90° = East, 90° = West)</li>
                    <li><strong>Capacity</strong> — total installed DC power of your array in kilowatt-peak</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── LOCATION TAB ── */}
            {activeTab === "location" && (
              <div className="profile-section">
                <div className="profile-section-title">📍 Installation Location</div>
                <p className="profile-section-sub">Click the map to update your panel's location.</p>

                <p className="map-hint">🖱 Click on the map to move your location pin</p>

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

                {errors.latitude && (
                  <div className="pf-error" style={{ marginBottom: 12 }}>⚠ {errors.latitude}</div>
                )}

                <p className="map-hint" style={{ marginTop: 4 }}>💡 Or enter coordinates manually</p>
                <div className="pf-row">
                  <div className="pf-group">
                    <label>Latitude</label>
                    <input
                      type="number" name="latitude" value={values.latitude}
                      onChange={handleInput}
                      className={errors.latitude ? "error" : ""}
                      placeholder="e.g. 36.8"
                    />
                  </div>
                  <div className="pf-group">
                    <label>Longitude</label>
                    <input
                      type="number" name="longitude" value={values.longitude}
                      onChange={handleInput}
                      className={errors.longitude ? "error" : ""}
                      placeholder="e.g. 10.1"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="profile-form-footer">
              <button
                type="button"
                className="profile-cancel-btn"
                onClick={() => navigate("/User", { state: existing })}
              >
                Cancel
              </button>
              <button type="submit" className="profile-save-btn" disabled={loading}>
                {loading ? "⏳ Saving…" : "💾 Save Changes"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
