// src/pages/Profile.jsx
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";
import { loadSession, saveSession } from "../utils/session";
import useTheme from "../hooks/useTheme"; // fix #9
import { API_BASE } from "../api";         // fix #10

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();

  // Fall back to localStorage if navigated to directly
  const existing = location.state || loadSession() || {};

  const [account, setAccount] = useState({
    name:     existing.name  || "",
    email:    existing.email || "",
    password: "",
  });
  const [system, setSystem] = useState({
    declination: String(existing.declination || ""),
    azimuth:     String(existing.azimuth     || ""),
    capacity:    String(existing.capacity    || ""),
  });
  const [loc, setLoc] = useState({
    latitude:  String(existing.latitude  || ""),
    longitude: String(existing.longitude || ""),
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

  // Load Leaflet once (fix #11: use window.L)
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (window.L) { setMapReady(true); return; }
    if (!document.querySelector('script[src*="leaflet@1.9.4"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    }
  }, []);

  // Init / re-init map when the location tab becomes active (fix #8)
  // We reset mapInstanceRef when the tab is left so the map re-initialises
  // correctly if the DOM node has been recreated.
  useEffect(() => {
    if (activeTab !== "location" || !mapReady) return;

    // Small delay so the DOM node is painted before Leaflet measures it
    const t = setTimeout(() => {
      if (!mapRef.current) return;

      // If a previous instance exists but the container was re-created
      // (React unmounted + remounted the conditional JSX), the old instance
      // points to a detached node. Destroy it and start fresh.
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) { /* ignore */ }
        mapInstanceRef.current = null;
        markerRef.current      = null;
      }

      const L    = window.L;
      const iLat = parseFloat(loc.latitude)  || 36;
      const iLng = parseFloat(loc.longitude) || 10;
      const map  = L.map(mapRef.current, { center: [iLat, iLng], zoom: 6 });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;background:#FBB03B;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(251,176,59,0.5);"></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28],
      });

      if (loc.latitude && loc.longitude)
        markerRef.current = L.marker([iLat, iLng], { icon }).addTo(map);

      map.on("click", e => {
        const rLat = Math.round(e.latlng.lat * 10000) / 10000;
        const rLng = Math.round(e.latlng.lng * 10000) / 10000;
        if (markerRef.current) markerRef.current.setLatLng([rLat, rLng]);
        else markerRef.current = L.marker([rLat, rLng], { icon }).addTo(map);
        setLoc({ latitude: String(rLat), longitude: String(rLng) });
        setErrors(p => { const n = { ...p }; delete n.latitude; return n; });
      });

      mapInstanceRef.current = map;
    }, 80);

    return () => {
      clearTimeout(t);
      // Fix #8: when leaving the location tab, destroy the Leaflet instance so
      // the next visit re-creates it against the fresh DOM node.
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) { /* ignore */ }
        mapInstanceRef.current = null;
        markerRef.current      = null;
      }
    };
  }, [activeTab, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = id => {
    setErrors({}); setGlobalError(""); setSuccess(""); setActiveTab(id);
  };

  const handleSave = async () => {
    setErrors({}); setGlobalError(""); setSuccess("");
    const errs = {};

    if (activeTab === "account") {
      if (!account.name.trim())  errs.name  = "Name is required";
      if (!account.email.trim()) errs.email = "Email is required";
      if (account.password && account.password.length < 6)
        errs.password = "Min. 6 characters";
    }
    if (activeTab === "system") {
      const dec = parseFloat(system.declination);
      const az  = parseFloat(system.azimuth);
      const cap = parseFloat(system.capacity);
      if (isNaN(dec) || dec < 0 || dec > 90)   errs.declination = "Must be 0–90°";
      if (isNaN(az)  || az < -180 || az > 180) errs.azimuth     = "Must be −180–180°";
      if (isNaN(cap) || cap <= 0)               errs.capacity    = "Must be a positive number";
    }
    if (activeTab === "location") {
      if (!loc.latitude || !loc.longitude) errs.latitude = "Please set a location on the map";
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      let payload = {};
      if (activeTab === "account") {
        payload = { name: account.name, email: account.email };
        if (account.password) payload.password = account.password;
      }
      if (activeTab === "system") {
        payload = {
          declination: system.declination,
          azimuth:     system.azimuth,
          capacity:    system.capacity,
        };
      }
      if (activeTab === "location") {
        payload = { latitude: loc.latitude, longitude: loc.longitude };
      }

      const res = await axios.put(`${API_BASE}/users/${existing.userId}`, payload);

      const updatedUser = {
        userId:      existing.userId,
        name:        res.data.name        ?? account.name,
        email:       res.data.email       ?? account.email,
        latitude:    res.data.latitude    ?? loc.latitude,
        longitude:   res.data.longitude   ?? loc.longitude,
        declination: res.data.declination ?? system.declination,
        azimuth:     res.data.azimuth     ?? system.azimuth,
        capacity:    res.data.capacity    ?? system.capacity,
      };
      saveSession(updatedUser);

      setSuccess("✓ Saved! Returning to dashboard…");
      if (activeTab === "account") setAccount(p => ({ ...p, password: "" }));

      setTimeout(() => navigate("/User", { state: updatedUser }), 1000);
    } catch (err) {
      setGlobalError(
        err.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const initials = account.name
    ? account.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="profile-page">
      <header className="profile-topbar">
        <div className="profile-topbar-left">
          <span className="topbar-logo">☀️ PVForecast</span>
          <div className="topbar-divider" />
          <span className="topbar-title">Edit Profile</span>
        </div>
        <div className="profile-topbar-right">
          {/* fix #2: shared .theme-toggle class */}
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button
            className="profile-back-btn"
            type="button"
            onClick={() => navigate("/User", { state: existing })}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="profile-content">
        <aside className="profile-sidebar">
          <div className="profile-avatar-block">
            <div className="profile-avatar-lg">{initials}</div>
            <div className="profile-avatar-name">{account.name || "Your Name"}</div>
            <div className="profile-avatar-sub">PVForecast Member</div>
          </div>
          <nav className="profile-nav">
            {[
              { id: "account",  label: "👤 Account"  },
              { id: "system",   label: "⚡ PV System" },
              { id: "location", label: "📍 Location"  },
            ].map(tab => (
              <button
                key={tab.id}
                className={`profile-nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => switchTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="profile-system-summary">
            <div className="pss-label">Current System</div>
            {[
              ["📍", `${loc.latitude  || existing.latitude  || "—"}°, ${loc.longitude || existing.longitude || "—"}°`],
              ["↕️", `Declination ${system.declination || existing.declination || "—"}°`],
              ["↔️", `Azimuth ${system.azimuth || existing.azimuth || "—"}°`],
              ["🔋", `${system.capacity || existing.capacity || "—"} kWp`],
            ].map(([icon, text]) => (
              <div className="pss-row" key={text}><span>{icon}</span><span>{text}</span></div>
            ))}
          </div>
        </aside>

        <main className="profile-main">
          {globalError && <div className="profile-alert error">⚠ {globalError}</div>}
          {success     && <div className="profile-alert success">{success}</div>}

          {/* ── ACCOUNT TAB ── */}
          {activeTab === "account" && (
            <div className="profile-section">
              <div className="profile-section-title">👤 Account Details</div>
              <p className="profile-section-sub">Update your name, email address, or password.</p>
              <div className="pf-group">
                <label>Full Name</label>
                <input
                  value={account.name}
                  placeholder="Jane Doe"
                  className={errors.name ? "error" : ""}
                  onChange={e => {
                    setAccount(p => ({ ...p, name: e.target.value }));
                    setErrors(p => { const n = { ...p }; delete n.name; return n; });
                  }}
                />
                {errors.name && <span className="pf-error">⚠ {errors.name}</span>}
              </div>
              <div className="pf-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={account.email}
                  placeholder="jane@email.com"
                  className={errors.email ? "error" : ""}
                  onChange={e => {
                    setAccount(p => ({ ...p, email: e.target.value }));
                    setErrors(p => { const n = { ...p }; delete n.email; return n; });
                  }}
                />
                {errors.email && <span className="pf-error">⚠ {errors.email}</span>}
              </div>
              <div className="pf-group">
                <label>
                  New Password{" "}
                  <span className="pf-optional">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={account.password}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={errors.password ? "error" : ""}
                  onChange={e => {
                    setAccount(p => ({ ...p, password: e.target.value }));
                    setErrors(p => { const n = { ...p }; delete n.password; return n; });
                  }}
                />
                {errors.password && <span className="pf-error">⚠ {errors.password}</span>}
              </div>
            </div>
          )}

          {/* ── SYSTEM TAB ── */}
          {activeTab === "system" && (
            <div className="profile-section">
              <div className="profile-section-title">⚡ PV System Configuration</div>
              <p className="profile-section-sub">
                Change your panel specs — no email or password needed here.
              </p>
              <div className="pf-row">
                <div className="pf-group">
                  <label>Declination (0–90°)</label>
                  <input
                    type="number"
                    value={system.declination}
                    placeholder="e.g. 35"
                    className={errors.declination ? "error" : ""}
                    onChange={e => {
                      setSystem(p => ({ ...p, declination: e.target.value }));
                      setErrors(p => { const n = { ...p }; delete n.declination; return n; });
                    }}
                  />
                  {errors.declination && <span className="pf-error">⚠ {errors.declination}</span>}
                </div>
                <div className="pf-group">
                  <label>Azimuth (−180–180°)</label>
                  <input
                    type="number"
                    value={system.azimuth}
                    placeholder="e.g. 0 (South)"
                    className={errors.azimuth ? "error" : ""}
                    onChange={e => {
                      setSystem(p => ({ ...p, azimuth: e.target.value }));
                      setErrors(p => { const n = { ...p }; delete n.azimuth; return n; });
                    }}
                  />
                  {errors.azimuth && <span className="pf-error">⚠ {errors.azimuth}</span>}
                </div>
              </div>
              <div className="pf-group">
                <label>System Capacity (kWp)</label>
                <input
                  type="number"
                  value={system.capacity}
                  placeholder="e.g. 5.5"
                  className={errors.capacity ? "error" : ""}
                  onChange={e => {
                    setSystem(p => ({ ...p, capacity: e.target.value }));
                    setErrors(p => { const n = { ...p }; delete n.capacity; return n; });
                  }}
                />
                {errors.capacity && <span className="pf-error">⚠ {errors.capacity}</span>}
              </div>
              <div className="pf-info-card">
                <div className="pf-info-title">💡 Tips</div>
                <ul>
                  <li><strong>Declination</strong> — tilt from horizontal (0° = flat, 90° = vertical)</li>
                  <li><strong>Azimuth</strong> — panel direction (0° = South, −90° = East, +90° = West)</li>
                  <li><strong>Capacity</strong> — total installed DC peak power in kWp</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── LOCATION TAB ── */}
          {activeTab === "location" && (
            <div className="profile-section">
              <div className="profile-section-title">📍 Installation Location</div>
              <p className="profile-section-sub">
                Click the map or enter coordinates to update your site.
              </p>
              <p className="map-hint">🖱 Click on the map to place your pin</p>
              {/* map-wrapper is always rendered while on this tab so the ref stays valid */}
              <div className="map-wrapper" ref={mapRef}>
                {!mapReady && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Loading map…
                  </div>
                )}
              </div>
              <div className="coords-display">
                <div className="coord-pill"><label>Latitude</label><span>{loc.latitude || "—"}</span></div>
                <div className="coord-pill"><label>Longitude</label><span>{loc.longitude || "—"}</span></div>
              </div>
              {errors.latitude && (
                <div className="pf-error" style={{ marginBottom: 12 }}>⚠ {errors.latitude}</div>
              )}
              <p className="map-hint" style={{ marginTop: 4 }}>💡 Or enter manually</p>
              <div className="pf-row">
                <div className="pf-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    value={loc.latitude}
                    placeholder="e.g. 36.8"
                    onChange={e => setLoc(p => ({ ...p, latitude: e.target.value }))}
                  />
                </div>
                <div className="pf-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    value={loc.longitude}
                    placeholder="e.g. 10.1"
                    onChange={e => setLoc(p => ({ ...p, longitude: e.target.value }))}
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
            <button
              type="button"
              className="profile-save-btn"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "⏳ Saving…" : "💾 Save Changes"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
