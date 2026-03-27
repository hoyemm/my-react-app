// src/pages/User.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./User.css";

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

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      <div className="value">{payload[0].value} {unit}</div>
    </div>
  );
};

/* ── User avatar dropdown ── */
function UserMenu({ name, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-avatar-btn" onClick={() => setOpen(o => !o)} aria-label="User menu">
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
          <button className="ud-item" onClick={() => { setOpen(false); onNavigate("profile"); }}>
            <span>⚙️</span> Edit Profile
          </button>
          <button className="ud-item" onClick={() => { setOpen(false); onNavigate("settings"); }}>
            <span>🔧</span> System Settings
          </button>
          <div className="ud-divider" />
          <Link to="/" className="ud-item ud-logout">
            <span>←</span> Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}

export default function User() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, name, latitude, longitude, declination, azimuth, capacity } = location.state || {};

  const [todayData,    setTodayData]    = useState({ power: [], energy: [], cumulative: [] });
  const [tomorrowData, setTomorrowData] = useState({ power: [], energy: [], cumulative: [] });
  const [kpis,         setKpis]         = useState({ today: 0, tomorrow: 0, current: 0, peak: 0 });
  const [activeDay,    setActiveDay]    = useState("today");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [theme,        toggleTheme]     = useTheme();

  useEffect(() => {
    if (!latitude || !longitude || !declination || !azimuth || !capacity) {
      setError("Missing PV system data. Please log in again.");
      setLoading(false);
      return;
    }

    async function fetchForecast() {
      try {
        const res = await axios.get(
          `http://localhost:3001/forecast/${latitude}/${longitude}/${declination}/${azimuth}/${capacity}`
        );
        const result = res.data.result;
        const { watts, watt_hours_period: period, watt_hours: cumulative, watt_hours_day } = result;
        const days     = Object.keys(watt_hours_day);
        const today    = days[0];
        const tomorrow = days[1];

        const splitPower = (date) =>
          Object.entries(watts)
            .filter(([t]) => t.startsWith(date))
            .map(([time, val]) => ({ time: time.slice(11, 16), value: Math.round(val) }));

        const splitEnergy = (data, date) =>
          Object.entries(data)
            .filter(([t]) => t.startsWith(date))
            .map(([time, val]) => ({ time: time.slice(11, 16), value: +(val / 1000).toFixed(2) }));

        setTodayData({
          power:      splitPower(today),
          energy:     splitEnergy(period,     today),
          cumulative: splitEnergy(cumulative, today),
        });
        setTomorrowData({
          power:      splitPower(tomorrow),
          energy:     splitEnergy(period,     tomorrow),
          cumulative: splitEnergy(cumulative, tomorrow),
        });

        const peak    = Math.max(...Object.values(watts));
        const now     = new Date().toISOString().slice(0, 16);
        let nearest   = null;
        Object.keys(watts).forEach(t => { if (t <= now) nearest = t; });

        setKpis({
          today:    (watt_hours_day[today]    / 1000).toFixed(2),
          tomorrow: (watt_hours_day[tomorrow] / 1000).toFixed(2),
          current:  nearest ? (watts[nearest] / 1000).toFixed(2) : "0.00",
          peak:     (peak / 1000).toFixed(2),
        });
        setLoading(false);
      } catch {
        setError("Failed to fetch forecast. Check your backend connection.");
        setLoading(false);
      }
    }

    fetchForecast();
  }, [latitude, longitude, declination, azimuth, capacity]);

  const handleMenuNavigate = (dest) => {
    if (dest === "profile" || dest === "settings") {
      navigate("/Profile", {
        state: { userId, name, latitude, longitude, declination, azimuth, capacity }
      });
    }
  };

  const data      = activeDay === "today" ? todayData : tomorrowData;
  const dayLabel  = activeDay === "today" ? "Today" : "Tomorrow";
  const todayDate    = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="dashboard">
      {/* TOPBAR */}
      <header className="dashboard-topbar">
        <div className="topbar-left">
          <span className="topbar-logo">☀️ PVForecast</span>
          <div className="topbar-divider" />
          <span className="topbar-title">Welcome back, <strong>{name || "User"}</strong></span>
        </div>
        <div className="topbar-right">
          <div className="topbar-meta">{todayDate}</div>
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <UserMenu name={name} onNavigate={handleMenuNavigate} />
        </div>
      </header>

      <div className="dashboard-content">
        {loading ? (
          <div className="dashboard-state">
            <div className="loading-spinner" />
            <h3>Fetching forecast…</h3>
            <p>Contacting forecast.solar API with your panel configuration</p>
          </div>
        ) : error ? (
          <div className="dashboard-state">
            <div className="error-icon">⚡</div>
            <h3>Forecast unavailable</h3>
            <p>{error}</p>
            <Link to="/" className="home-link" style={{ marginTop: 8 }}>← Return Home</Link>
          </div>
        ) : (
          <>
            {/* SYSTEM INFO */}
            <div className="system-info">
              <span className="system-info-label">⚡ System</span>
              <div className="system-pill"><span>📍</span> <strong>{latitude}°N, {longitude}°E</strong></div>
              <div className="system-pill"><span>↕️</span> Dec <strong>{declination}°</strong></div>
              <div className="system-pill"><span>↔️</span> Az <strong>{azimuth}°</strong></div>
              <div className="system-pill"><span>🔋</span> <strong>{capacity} kWp</strong></div>
            </div>

            {/* KPI CARDS */}
            <div className="kpi-grid">
              <div className="kpi-card today">
                <div className="kpi-icon">📅</div>
                <div className="kpi-label">Today's Production</div>
                <div className="kpi-value">{kpis.today}</div>
                <div className="kpi-unit">kWh — {todayDate}</div>
              </div>
              <div className="kpi-card tomorrow">
                <div className="kpi-icon">📆</div>
                <div className="kpi-label">Tomorrow's Forecast</div>
                <div className="kpi-value">{kpis.tomorrow}</div>
                <div className="kpi-unit">kWh — {tomorrowDate}</div>
              </div>
              <div className="kpi-card current">
                <div className="kpi-icon">⚡</div>
                <div className="kpi-label">Current Output</div>
                <div className="kpi-value">{kpis.current}</div>
                <div className="kpi-unit">kW right now</div>
              </div>
              <div className="kpi-card peak">
                <div className="kpi-icon">🏆</div>
                <div className="kpi-label">Peak Power</div>
                <div className="kpi-value">{kpis.peak}</div>
                <div className="kpi-unit">kW maximum</div>
              </div>
            </div>

            {/* DAY TABS */}
            <div className="day-tabs">
              <button className={`day-tab ${activeDay === "today"    ? "active" : ""}`} onClick={() => setActiveDay("today")}>
                📅 Today — {kpis.today} kWh
              </button>
              <button className={`day-tab ${activeDay === "tomorrow" ? "active" : ""}`} onClick={() => setActiveDay("tomorrow")}>
                📆 Tomorrow — {kpis.tomorrow} kWh
              </button>
            </div>

            {/* CHARTS */}
            <div className="charts-grid">
              {/* Power Curve */}
              <div className="chart-card full-width">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">⚡ {dayLabel}'s Power Curve</div>
                    <div className="chart-subtitle">Instantaneous output throughout the day</div>
                  </div>
                  <span className="chart-badge">Watts (W)</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.power} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#FBB03B" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FBB03B" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis                tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="W" />} />
                    <Area type="monotone" dataKey="value" stroke="var(--amber)" strokeWidth={2} fill="url(#powerGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Hourly Energy */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">🔋 Hourly Energy</div>
                    <div className="chart-subtitle">Energy generated per interval</div>
                  </div>
                  <span className="chart-badge">kWh</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.energy} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis                tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="kWh" />} />
                    <Bar dataKey="value" fill="var(--blue)" radius={[4,4,0,0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cumulative */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">📈 Cumulative Energy</div>
                    <div className="chart-subtitle">Running total over the day</div>
                  </div>
                  <span className="chart-badge">kWh</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.cumulative} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis                tick={{ fill: "var(--text-dim)", fontSize: 11 }} axisLine={false} tickLine={false} />
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
