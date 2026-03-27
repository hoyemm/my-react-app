// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Home.css";

/* ── tiny hook: respect saved theme ── */
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

/* ── animated counter ── */
function AnimCounter({ end, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = end / 60;
      const t = setInterval(() => {
        start += step;
        if (start >= end) { setVal(end); clearInterval(t); }
        else setVal(Math.round(start));
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── mock forecast chart for demo ── */
const DEMO_CURVE = [
  { h: "06:00", w: 0 }, { h: "07:00", w: 180 }, { h: "08:00", w: 620 },
  { h: "09:00", w: 1240 }, { h: "10:00", w: 2100 }, { h: "11:00", w: 2870 },
  { h: "12:00", w: 3280 }, { h: "13:00", w: 3150 }, { h: "14:00", w: 2760 },
  { h: "15:00", w: 2010 }, { h: "16:00", w: 1150 }, { h: "17:00", w: 440 },
  { h: "18:00", w: 80 }, { h: "19:00", w: 0 },
];
const MAX_W = 3280;

function DemoChart() {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="demo-chart">
      <div className="demo-chart-bars">
        {DEMO_CURVE.map((d, i) => (
          <div
            key={i}
            className={`demo-bar-wrap ${hovered === i ? "hovered" : ""}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="demo-bar"
              style={{ height: `${(d.w / MAX_W) * 100}%` }}
            />
            {hovered === i && (
              <div className="demo-tooltip">
                <strong>{d.w} W</strong>
                <span>{d.h}</span>
              </div>
            )}
            <span className="demo-bar-label">{i % 2 === 0 ? d.h.slice(0, 2) : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TEAM = [
  {
    name: "Yassine Bk",
    role: "Full-Stack Engineer",
    bio: "Built the forecast pipeline and React dashboard from scratch.",
    avatar: "🧑‍💻",
    accent: "#FBB03B",
  },
];

export default function Home() {
  const [theme, toggleTheme] = useTheme();
  const [demoCapacity, setDemoCapacity] = useState(5);
  const demoPeak = ((demoCapacity / 5) * 3.28).toFixed(2);
  const demoDaily = ((demoCapacity / 5) * 18.4).toFixed(1);

  return (
    <div className="home-container">

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="logo">☀️ PV<span>Forecast</span></div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#demo">Demo</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <Link to="/Login">Login</Link>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <Link to="/Signup" className="signup-btn">Get Started →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="home" className="hero">
        <div className="hero-text">
          <div className="hero-eyebrow">
            <span>⚡</span> Solar Energy Intelligence
          </div>
          <h1>
            Forecast Your<br />
            <em>Solar Output</em><br />
            with Precision
          </h1>
          <p>
            Enter your PV system specs, pick your location on a map, and get
            accurate day-ahead energy production forecasts powered by real
            meteorological data.
          </p>
          <div className="hero-actions">
            <Link to="/Signup">
              <button className="btn-primary">Create Free Account</button>
            </Link>
            <a href="#demo" className="btn-ghost">See Live Demo</a>
          </div>
        </div>

        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1509395176047-4a66953fd231?w=900&q=80"
            alt="Solar panels on rooftop"
          />
          <div className="hero-image-badge">
            <div className="badge-icon">☀️</div>
            <div className="badge-text">
              <strong>+24.7 kWh</strong>
              <span>Forecasted for tomorrow</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stat-item">
          <strong><AnimCounter end={99} suffix=".2%" /></strong>
          <span>Forecast accuracy</span>
        </div>
        <div className="stat-item">
          <strong><AnimCounter end={48} suffix="hr" /></strong>
          <span>Ahead prediction window</span>
        </div>
        <div className="stat-item">
          <strong>Real-time</strong>
          <span>Weather-based modeling</span>
        </div>
      </div>

      {/* ── DEMO SECTION ── */}
      <section id="demo" className="demo-section">
        <div className="section-header">
          <div className="section-eyebrow">🔬 Interactive Preview</div>
          <h2>See it in action</h2>
          <p>Adjust your system capacity and watch the forecast update instantly</p>
        </div>

        <div className="demo-grid">
          {/* Controls */}
          <div className="demo-controls">
            <div className="demo-control-card">
              <h3>Your PV System</h3>

              <div className="demo-param">
                <label>System Capacity</label>
                <div className="demo-slider-row">
                  <input
                    type="range" min="1" max="20" value={demoCapacity}
                    onChange={e => setDemoCapacity(+e.target.value)}
                    className="demo-slider"
                  />
                  <span className="demo-slider-val">{demoCapacity} kWp</span>
                </div>
              </div>

              <div className="demo-param">
                <label>Location</label>
                <div className="demo-loc">📍 Paris, France (sample)</div>
              </div>

              <div className="demo-param">
                <label>Panel Angle</label>
                <div className="demo-loc">↕️ 35° declination, 0° azimuth</div>
              </div>

              <div className="demo-kpis">
                <div className="demo-kpi">
                  <span>Peak Power</span>
                  <strong>{demoPeak} kW</strong>
                </div>
                <div className="demo-kpi">
                  <span>Daily Yield</span>
                  <strong>{demoDaily} kWh</strong>
                </div>
                <div className="demo-kpi">
                  <span>Forecast</span>
                  <strong>48 hours</strong>
                </div>
              </div>

              <Link to="/Signup">
                <button className="btn-primary" style={{ width: "100%", marginTop: 8 }}>
                  Try with your location →
                </button>
              </Link>
            </div>
          </div>

          {/* Chart */}
          <div className="demo-chart-card">
            <div className="demo-chart-header">
              <div>
                <div className="chart-title-demo">⚡ Today's Power Curve</div>
                <div className="chart-sub-demo">Hover bars for watt values · Sample data for Paris</div>
              </div>
              <span className="demo-badge">Live Preview</span>
            </div>
            <DemoChart />
            <div className="demo-chart-footer">
              <span>🕐 06:00</span>
              <span>Peak at 12:00 — {demoPeak} kW</span>
              <span>🌙 19:00</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="features">
        <div className="section-header">
          <div className="section-eyebrow">🛠 Toolkit</div>
          <h2>Everything you need</h2>
          <p>A complete platform for monitoring and optimizing your solar investment</p>
        </div>
        <div className="feature-grid">
          {[
            { icon: "🗺️", title: "Map-Based Setup", desc: "Click anywhere on the interactive map to set your exact coordinates. No manual lat/lon entry needed." },
            { icon: "📊", title: "Smart Dashboard", desc: "Today & tomorrow power curves, hourly energy bars, and cumulative production — all in one view." },
            { icon: "⚡", title: "Live KPIs", desc: "Current output, peak wattage, and daily totals updated with each forecast refresh." },
            { icon: "🔧", title: "PV System Config", desc: "Tune declination, azimuth, and panel capacity to match your exact installation." },
            { icon: "🔒", title: "Secure & Private", desc: "Password hashing with bcrypt. Your data stays yours — always." },
            { icon: "🌍", title: "Global Coverage", desc: "Works anywhere on Earth with irradiance data from the forecast.solar API." },
          ].map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="about">
        <div className="about-text">
          <div className="section-eyebrow" style={{ marginBottom: 20 }}>👋 About Us</div>
          <h2>Built for solar owners &amp; engineers</h2>
          <p>
            PVForecast connects your panel configuration with real meteorological
            data to give you production estimates you can actually rely on — not
            rough guesses.
          </p>
          <p>
            Whether you're optimizing self-consumption, planning battery storage,
            or just curious how much the clouds will cost you tomorrow, this
            dashboard gives you the insight.
          </p>
          <p>
            We believe renewable energy tools should be accessible to everyone —
            from rooftop hobbyists to professional installers. That's why PVForecast
            is free, open-source, and built with simplicity first.
          </p>

          {/* Team */}
          <div className="team-grid">
            {TEAM.map((m, i) => (
              <div className="team-card" key={i}>
                <div className="team-avatar" style={{ background: m.accent + "22", border: `1.5px solid ${m.accent}44` }}>
                  {m.avatar}
                </div>
                <div>
                  <strong>{m.name}</strong>
                  <span className="team-role">{m.role}</span>
                  <p className="team-bio">{m.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="about-visual">
          <div className="about-stat-row">
            <span>Forecast horizon</span>
            <strong>48 hours</strong>
          </div>
          <div className="about-stat-row">
            <span>Data granularity</span>
            <strong>15-min intervals</strong>
          </div>
          <div className="about-stat-row">
            <span>Supported systems</span>
            <strong>Any PV setup</strong>
          </div>
          <div className="about-stat-row">
            <span>Powered by</span>
            <strong>forecast.solar API</strong>
          </div>
          <div className="about-stat-row">
            <span>Security</span>
            <strong>bcrypt hashing</strong>
          </div>
          <div className="about-stat-row">
            <span>Coverage</span>
            <strong>Worldwide 🌍</strong>
          </div>
          <Link to="/Signup" style={{ marginTop: 8 }}>
            <button className="btn-primary" style={{ width: "100%" }}>
              Get started free →
            </button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <span className="footer-logo">☀️ PVForecast</span>
        <p>© 2026 PV Production Forecast — All rights reserved</p>
        <div className="footer-links">
          <Link to="/Login">Login</Link>
          <Link to="/Signup">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}
