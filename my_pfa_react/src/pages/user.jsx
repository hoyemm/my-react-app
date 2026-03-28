// src/pages/User.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import "./User.css";
import { loadSession, saveSession, clearSession } from "../utils/session";
import useTheme from "../hooks/useTheme";
import { API_BASE } from "../api";

/* ── helpers ── */
function fmtUpdated(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function wxIcon(clouds) {
  if (clouds == null) return "🌤️";
  if (clouds < 15)   return "☀️";
  if (clouds < 40)   return "⛅";
  if (clouds < 70)   return "🌥️";
  return "☁️";
}
function wxDesc(clouds) {
  if (clouds == null) return "—";
  if (clouds < 15)   return "Clear sky";
  if (clouds < 40)   return "Partly cloudy";
  if (clouds < 70)   return "Mostly cloudy";
  return "Overcast";
}

/* ── recharts tooltip ── */
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      <div className="value">{payload[0].value} {unit}</div>
    </div>
  );
};

/* ── user avatar dropdown ── */
function UserMenu({ name, onProfile, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";
  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-avatar-btn" onClick={() => setOpen(o => !o)}>
        <div className="user-avatar">{initials}</div>
        <span className="user-avatar-name">{name || "User"}</span>
        <span className="user-avatar-caret" style={{ transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>
      {open && (
        <div className="user-dropdown">
          <div className="ud-header">
            <div className="ud-avatar">{initials}</div>
            <div>
              <div className="ud-name">{name || "User"}</div>
              <div className="ud-role">Solar Dashboard</div>
            </div>
          </div>
          <div className="ud-divider" />
          <button className="ud-item" onClick={() => { setOpen(false); onProfile(); }}>
            <span>⚙️</span> Edit Profile &amp; Settings
          </button>
          <div className="ud-divider" />
          <Link to="/" className="ud-item"><span>🏠</span> Home</Link>
          <button className="ud-item ud-logout" onClick={() => { setOpen(false); onLogout(); }}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   WEATHER SECTION
══════════════════════════════════════════════ */
function WeatherSection({ userId, latitude, longitude }) {
  const [wx,        setWx]        = useState(null);
  const [status,    setStatus]    = useState("loading");
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    if (!userId || !latitude || !longitude) { setStatus("error"); return; }
    axios.get(`${API_BASE}/weather/${userId}/${latitude}/${longitude}`)
      .then(res => {
        const { data, cached, updated_at } = res.data;
        setUpdatedAt(updated_at);
        setStatus(cached ? "cached" : "live");
        const current = data.data_current || {};
        const day0    = {};
        if (data.data_day) {
          const d = data.data_day;
          day0.tempMax  = d.temperature_max?.[0];
          day0.tempMin  = d.temperature_min?.[0];
          day0.precip   = d.precipitation?.[0];
          day0.sunshine = d.sunshinetime?.[0];
          day0.uvIndex  = d.uvindex?.[0];
          day0.windMax  = d.windspeed_max?.[0];
          day0.clouds   = d.totalcloudcover?.[0];
        }
        const temp      = current.temperature     ?? day0.tempMax;
        const clouds    = current.totalcloudcover ?? day0.clouds;
        const wind      = current.windspeed        ?? day0.windMax;
        const humidity  = current.relativehumidity;
        const feelsLike = current.felttemperature;
        let hourly = [];
        if (data.data_1h) {
          const h = data.data_1h;
          hourly = (h.time || [])
            .map((t, i) => ({ time: t.slice(11, 16), temp: h.temperature?.[i] ?? null, clouds: h.totalcloudcover?.[i] ?? null }))
            .filter(d => d.temp != null).slice(0, 24);
        }
        setWx({ temp, clouds, wind, humidity, feelsLike, day0, hourly });
      })
      .catch(() => setStatus("error"));
  }, [userId, latitude, longitude]);

  return (
    <div className="wx-section">
      <div className="wx-header">
        <div>
          <div className="wx-title">🌡️ Weather Forecast</div>
          <div className="wx-subtitle">Local conditions at your installation site</div>
        </div>
        <div className="wx-header-right">
          {status === "cached" && updatedAt && <span className="wx-stale-badge">📦 Cached · {fmtUpdated(updatedAt)}</span>}
          {status === "live"   && <span className="wx-live-badge">● Live</span>}
          <span className="wx-source-badge">meteoblue</span>
        </div>
      </div>
      {status === "loading" && <div className="wx-loading"><div className="wx-spinner" /><span>Fetching weather data…</span></div>}
      {status === "error"   && (
        <div className="wx-error">
          <span className="wx-err-icon">🌩️</span>
          <div><strong>Weather temporarily unavailable</strong><p>No cached data found.</p></div>
        </div>
      )}
      {(status === "live" || status === "cached") && wx && (
        <>
          <div className="wx-current">
            <div className="wx-now-main">
              <div className="wx-big-icon">{wxIcon(wx.clouds)}</div>
              <div className="wx-temp-block">
                <div className="wx-temp">{wx.temp != null ? `${Math.round(wx.temp)}°C` : "—"}</div>
                <div className="wx-desc">{wxDesc(wx.clouds)}</div>
                {wx.feelsLike != null && <div className="wx-feels">Feels like {Math.round(wx.feelsLike)}°C</div>}
              </div>
            </div>
            <div className="wx-pills">
              {wx.clouds   != null && <div className="wx-pill"><span className="wx-pill-icon">☁️</span><div><div className="wx-pill-val">{Math.round(wx.clouds)}%</div><div className="wx-pill-lbl">Cloud cover</div></div></div>}
              {wx.wind     != null && <div className="wx-pill"><span className="wx-pill-icon">💨</span><div><div className="wx-pill-val">{Math.round(wx.wind)} km/h</div><div className="wx-pill-lbl">Wind speed</div></div></div>}
              {wx.humidity != null && <div className="wx-pill"><span className="wx-pill-icon">💧</span><div><div className="wx-pill-val">{Math.round(wx.humidity)}%</div><div className="wx-pill-lbl">Humidity</div></div></div>}
              {wx.day0?.sunshine != null && <div className="wx-pill"><span className="wx-pill-icon">🌞</span><div><div className="wx-pill-val">{Math.round(wx.day0.sunshine)}h</div><div className="wx-pill-lbl">Sunshine</div></div></div>}
              {wx.day0?.uvIndex  != null && <div className="wx-pill"><span className="wx-pill-icon">🔆</span><div><div className="wx-pill-val">{wx.day0.uvIndex}</div><div className="wx-pill-lbl">UV Index</div></div></div>}
              {wx.day0?.precip   != null && <div className="wx-pill"><span className="wx-pill-icon">🌧️</span><div><div className="wx-pill-val">{wx.day0.precip} mm</div><div className="wx-pill-lbl">Precipitation</div></div></div>}
            </div>
          </div>
          {(wx.day0?.tempMax != null || wx.day0?.tempMin != null) && (
            <div className="wx-hilow">
              {wx.day0.tempMax != null && <span>↑ {Math.round(wx.day0.tempMax)}°C high</span>}
              {wx.day0.tempMin != null && <span>↓ {Math.round(wx.day0.tempMin)}°C low</span>}
            </div>
          )}
          {wx.hourly.length > 0 && (
            <div className="wx-chart-wrap">
              <div className="wx-chart-label">Temperature — next 24 h</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={wx.hourly} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <defs><linearGradient id="wxGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fill: "var(--text-dim)", fontSize: 10 }} axisLine={false} tickLine={false} unit="°" />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="custom-tooltip"><div className="label">{label}</div><div className="value" style={{ color: "var(--blue)" }}>{payload[0].value}°C</div></div> : null} />
                  <Area type="monotone" dataKey="temp" stroke="var(--blue)" strokeWidth={2} fill="url(#wxGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              {wx.hourly.some(d => d.clouds != null) && (
                <>
                  <div className="wx-chart-label" style={{ marginTop: 16 }}>Cloud cover (%)</div>
                  <ResponsiveContainer width="100%" height={70}>
                    <BarChart data={wx.hourly} margin={{ top: 2, right: 8, bottom: 0, left: -20 }}>
                      <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fill: "var(--text-dim)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                      <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="custom-tooltip"><div className="label">{label}</div><div className="value" style={{ color: "var(--text-muted)" }}>{payload[0].value}%</div></div> : null} />
                      <Bar dataKey="clouds" fill="rgba(148,163,184,0.45)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
export default function User() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── All hooks BEFORE any early return (Rules of Hooks) ──
  const [user, setUser] = useState(() => location.state || loadSession());

  const [todayData,    setTodayData]    = useState({ power: [], energy: [], cumulative: [] });
  const [tomorrowData, setTomorrowData] = useState({ power: [], energy: [], cumulative: [] });
  const [kpis,         setKpis]         = useState({ today: 0, tomorrow: 0, current: 0, peak: 0 });
  const [activeDay,    setActiveDay]    = useState("today");
  const [forecastState,     setForecastState]     = useState("loading");
  const [forecastUpdatedAt, setForecastUpdatedAt] = useState(null);
  const [theme, toggleTheme] = useTheme();

  // Redirect if no session
  useEffect(() => {
    if (!user) { navigate("/Login", { replace: true }); return; }
    // Re-fetch fresh user data from DB on every mount so that returning from
    // the Home page (which doesn't carry state) still has a valid session.
    axios.get(`${API_BASE}/me/${user.userId}`)
      .then(res => {
        const fresh = res.data;
        saveSession(fresh);
        setUser(fresh);
      })
      .catch(() => {
        // Network error — fall back to what we already have in localStorage
        // Don't log out the user just because /me failed
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch forecast whenever user params are known
  useEffect(() => {
    if (!user) return;
    const { userId, latitude, longitude, declination, azimuth, capacity } = user;
    if (!userId || !latitude || !longitude || !declination || !azimuth || !capacity) {
      setForecastState("error"); return;
    }
    setForecastState("loading");
    axios.get(`${API_BASE}/forecast/${userId}/${latitude}/${longitude}/${declination}/${azimuth}/${capacity}`)
      .then(res => {
        if (res.data.error) throw new Error(res.data.error);
        setForecastState(res.data.cached ? "cached" : "live");
        setForecastUpdatedAt(res.data.updated_at);
        const result = res.data.result;
        const { watts, watt_hours_period: period, watt_hours: cumulative, watt_hours_day } = result;
        const days     = Object.keys(watt_hours_day);
        const today    = days[0];
        const tomorrow = days[1];
        const splitPower  = date => Object.entries(watts).filter(([t]) => t.startsWith(date)).map(([time, val]) => ({ time: time.slice(11, 16), value: Math.round(val) }));
        const splitEnergy = (src, date) => Object.entries(src).filter(([t]) => t.startsWith(date)).map(([time, val]) => ({ time: time.slice(11, 16), value: +(val / 1000).toFixed(2) }));
        setTodayData({ power: splitPower(today), energy: splitEnergy(period, today), cumulative: splitEnergy(cumulative, today) });
        setTomorrowData({ power: splitPower(tomorrow), energy: splitEnergy(period, tomorrow), cumulative: splitEnergy(cumulative, tomorrow) });
        const peak    = Math.max(...Object.values(watts));
        const now     = new Date().toISOString().slice(0, 16);
        const nearest = Object.keys(watts).reduce((acc, t) => (t <= now ? t : acc), null);
        setKpis({
          today:    (watt_hours_day[today]    / 1000).toFixed(2),
          tomorrow: (watt_hours_day[tomorrow] / 1000).toFixed(2),
          current:  nearest ? (watts[nearest] / 1000).toFixed(2) : "0.00",
          peak:     (peak / 1000).toFixed(2),
        });
      })
      .catch(() => setForecastState("error"));
  }, [user?.userId, user?.latitude, user?.longitude, user?.declination, user?.azimuth, user?.capacity]);

  if (!user) return null;

  const { userId, name, email, latitude, longitude, declination, azimuth, capacity } = user;
  const todayDate    = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const tomorrowDate = new Date(Date.now() + 86_400_000).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const data     = activeDay === "today" ? todayData : tomorrowData;
  const dayLabel = activeDay === "today" ? "Today" : "Tomorrow";

  const handleProfile = () => navigate("/Profile", { state: user });
  const handleLogout  = () => { clearSession(); navigate("/"); };

  return (
    <div className="dashboard">
      <header className="dashboard-topbar">
        <div className="topbar-left">
          <Link to="/" className="topbar-logo-link">
            <span className="topbar-logo">☀️ PVForecast</span>
          </Link>
          <div className="topbar-divider" />
          <span className="topbar-title">Welcome back, <strong>{name || "User"}</strong></span>
        </div>
        <div className="topbar-right">
          <div className="topbar-meta">{todayDate}</div>
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <UserMenu name={name} onProfile={handleProfile} onLogout={handleLogout} />
        </div>
      </header>

      <div className="dashboard-content">
        <div className="system-info">
          <span className="system-info-label">⚡ System</span>
          <div className="system-pill"><span>📍</span><strong>{latitude || "—"}°N, {longitude || "—"}°E</strong></div>
          <div className="system-pill"><span>↕️</span>Dec <strong>{declination || "—"}°</strong></div>
          <div className="system-pill"><span>↔️</span>Az <strong>{azimuth || "—"}°</strong></div>
          <div className="system-pill"><span>🔋</span><strong>{capacity || "—"} kWp</strong></div>
        </div>

        <WeatherSection userId={userId} latitude={latitude} longitude={longitude} />

        {forecastState === "cached" && forecastUpdatedAt && (
          <div className="stale-banner"><span>📦</span><span>Showing cached solar forecast from <strong>{fmtUpdated(forecastUpdatedAt)}</strong> — live data temporarily unavailable</span></div>
        )}
        {forecastState === "error" && (
          <div className="forecast-error-banner"><span>⚡</span><div><strong>Solar forecast unavailable</strong><p>Could not reach the forecast API and no cached data was found.</p></div></div>
        )}
        {forecastState === "loading" && (
          <div className="forecast-loading"><div className="loading-spinner-sm" /><span>Fetching solar forecast…</span></div>
        )}

        {(forecastState === "live" || forecastState === "cached") && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card today">    <div className="kpi-icon">📅</div><div className="kpi-label">Today's Production</div><div className="kpi-value">{kpis.today}</div><div className="kpi-unit">kWh — {todayDate}</div></div>
              <div className="kpi-card tomorrow"> <div className="kpi-icon">📆</div><div className="kpi-label">Tomorrow's Forecast</div><div className="kpi-value">{kpis.tomorrow}</div><div className="kpi-unit">kWh — {tomorrowDate}</div></div>
              <div className="kpi-card current">  <div className="kpi-icon">⚡</div><div className="kpi-label">Current Output</div><div className="kpi-value">{kpis.current}</div><div className="kpi-unit">kW right now</div></div>
              <div className="kpi-card peak">     <div className="kpi-icon">🏆</div><div className="kpi-label">Peak Power</div><div className="kpi-value">{kpis.peak}</div><div className="kpi-unit">kW maximum</div></div>
            </div>

            <div className="day-tabs">
              <button className={`day-tab ${activeDay === "today"    ? "active" : ""}`} onClick={() => setActiveDay("today")}>📅 Today — {kpis.today} kWh</button>
              <button className={`day-tab ${activeDay === "tomorrow" ? "active" : ""}`} onClick={() => setActiveDay("tomorrow")}>📆 Tomorrow — {kpis.tomorrow} kWh</button>
            </div>

            <div className="charts-grid">
              <div className="chart-card full-width">
                <div className="chart-header"><div><div className="chart-title">⚡ {dayLabel}'s Power Curve</div><div className="chart-subtitle">Instantaneous output throughout the day</div></div><span className="chart-badge">Watts (W)</span></div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.power} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs><linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FBB03B" stopOpacity={0.25} /><stop offset="95%" stopColor="#FBB03B" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="W" />} />
                    <Area type="monotone" dataKey="value" stroke="var(--amber)" strokeWidth={2} fill="url(#powerGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-header"><div><div className="chart-title">🔋 Hourly Energy</div><div className="chart-subtitle">Energy generated per interval</div></div><span className="chart-badge">kWh</span></div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.energy} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="kWh" />} />
                    <Bar dataKey="value" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-header"><div><div className="chart-title">📈 Cumulative Energy</div><div className="chart-subtitle">Running total over the day</div></div><span className="chart-badge">kWh</span></div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.cumulative} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs><linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} /><stop offset="95%" stopColor="#4ade80" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="kWh" />} />
                    <Area type="monotone" dataKey="value" stroke="var(--green)" strokeWidth={2} fill="url(#cumGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
