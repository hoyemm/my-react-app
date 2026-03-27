// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Home.css";

/* ── theme ── */
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("pvf-theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pvf-theme", theme);
  }, [theme]);
  return [theme, () => setTheme(t => t === "dark" ? "light" : "dark")];
}

/* ── intersection observer for reveal animations ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.12 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ── animated number ── */
function Count({ to, suffix = "", decimals = 0 }) {
  const [v, setV] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      let start = 0, frames = 80;
      const tick = () => {
        start++;
        setV(+(to * (start / frames)).toFixed(decimals));
        if (start < frames) requestAnimationFrame(tick);
        else setV(to);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [to, decimals]);
  return <span ref={ref}>{v}{suffix}</span>;
}

/* ── contact form state ── */
function ContactForm() {
  const [vals, setVals] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const set = k => e => setVals(p => ({ ...p, [k]: e.target.value }));
  const submit = e => {
    e.preventDefault();
    if (vals.name && vals.email && vals.message) setSent(true);
  };
  if (sent) return (
    <div className="contact-success">
      <div className="success-icon">✓</div>
      <h3>Message received!</h3>
      <p>We'll get back to you within 24 hours.</p>
    </div>
  );
  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="cf-row">
        <div className="cf-group">
          <label>Your Name</label>
          <input value={vals.name} onChange={set("name")} placeholder="Jane Doe" required />
        </div>
        <div className="cf-group">
          <label>Email Address</label>
          <input type="email" value={vals.email} onChange={set("email")} placeholder="jane@email.com" required />
        </div>
      </div>
      <div className="cf-group">
        <label>Subject</label>
        <input value={vals.subject} onChange={set("subject")} placeholder="How can we help?" />
      </div>
      <div className="cf-group">
        <label>Message</label>
        <textarea value={vals.message} onChange={set("message")} rows={5} placeholder="Tell us about your setup, questions, or feedback…" required />
      </div>
      <button type="submit" className="cf-submit">Send Message →</button>
    </form>
  );
}

export default function Home() {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenu]  = useState(false);
  useReveal();

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenu(false);
  };

  return (
    <div className="hp">

      {/* ════════════════════════════════ NAVBAR ══════════════════════════════ */}
      <nav className="nav">
        <button className="nav-logo" onClick={() => scrollTo("hero")}>
          <span className="logo-sun">◉</span> PVForecast
        </button>

        {/* desktop */}
        <div className="nav-center">
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("about")}>About</button>
          <button onClick={() => scrollTo("contact")}>Contact</button>
        </div>

        <div className="nav-right">
          <button className="nav-theme" onClick={toggleTheme} aria-label="toggle theme">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <Link to="/Login" className="nav-login">Sign In</Link>
          <Link to="/Signup" className="nav-cta">Get Started</Link>
        </div>

        {/* mobile hamburger */}
        <button className="nav-burger" onClick={() => setMenu(m => !m)}>
          <span /><span /><span />
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-menu">
          {["features","about","contact"].map(id => (
            <button key={id} onClick={() => scrollTo(id)}>{id.charAt(0).toUpperCase()+id.slice(1)}</button>
          ))}
          <Link to="/Login" onClick={() => setMenu(false)}>Sign In</Link>
          <Link to="/Signup" onClick={() => setMenu(false)} className="mob-cta">Get Started →</Link>
        </div>
      )}

      {/* ════════════════════════════════ HERO ════════════════════════════════ */}
      <section id="hero" className="hero">
        {/* atmospheric grid */}
        <div className="hero-grid" aria-hidden />

        {/* radial sun glow */}
        <div className="hero-glow" aria-hidden />

        {/* left: text */}
        <div className="hero-content">
          <div className="hero-chip">
            <span className="chip-dot" />
            Live Forecast Engine
          </div>

          <h1 className="hero-h1">
            Know exactly<br />
            <em>how much sun</em><br />
            tomorrow holds.
          </h1>

          <p className="hero-sub">
            Feed in your panel specs, drop a pin on the map. PVForecast
            pulls real meteorological data and returns a precise 48-hour
            production curve — updated every time.
          </p>

          <div className="hero-btns">
            <Link to="/Signup" className="btn-glow">Start forecasting free</Link>
            <Link to="/Login" className="btn-outline">Sign In →</Link>
          </div>

          <div className="hero-trust">
            <span>⚡ No credit card</span>
            <span>·</span>
            <span>🌍 Global coverage</span>
            <span>·</span>
            <span>📡 Real-time data</span>
          </div>
        </div>

        {/* right: live card */}
        <div className="hero-card">
          <div className="hcard-header">
            <div className="hcard-title">
              <span className="hcard-pulse" />
              Live Forecast Preview
            </div>
            <span className="hcard-badge">Paris · Today</span>
          </div>

          <div className="hcard-arc">
            <svg viewBox="0 0 200 110" fill="none" className="arc-svg">
              <path d="M10 100 A90 90 0 0 1 190 100" stroke="var(--grid)" strokeWidth="2" />
              <path d="M10 100 A90 90 0 0 1 190 100" stroke="var(--amber)" strokeWidth="3"
                    strokeDasharray="283" strokeDashoffset="60" strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 6px var(--amber))" }} />
              <circle cx="168" cy="38" r="5" fill="var(--amber)"
                      style={{ filter: "drop-shadow(0 0 8px var(--amber))" }} />
              <text x="100" y="88" textAnchor="middle" fill="var(--amber)"
                    fontSize="28" fontFamily="var(--font-display)" fontWeight="800">3.1</text>
              <text x="100" y="104" textAnchor="middle" fill="var(--muted)" fontSize="10">kW peak</text>
            </svg>
          </div>

          <div className="hcard-stats">
            <div className="hcs"><strong>24.7</strong><span>kWh today</span></div>
            <div className="hcs-div" />
            <div className="hcs"><strong>22.1</strong><span>kWh tomorrow</span></div>
            <div className="hcs-div" />
            <div className="hcs"><strong>48h</strong><span>horizon</span></div>
          </div>

          <div className="hcard-mini-bars">
            {[10,35,72,95,100,92,75,42,15].map((h,i) => (
              <div key={i} className="hmb" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="hcard-footer">06:00 ─────────────── 18:00</div>
        </div>
      </section>

      {/* ════════════════════════════════ TICKER ══════════════════════════════ */}
      <div className="ticker">
        <div className="ticker-inner">
          {[
            "☀️ 48-hour forecast window",
            "⚡ 15-minute resolution",
            "🌍 Works worldwide",
            "📡 forecast.solar API",
            "🔒 bcrypt secured",
            "📊 Real-time charts",
            "☀️ 48-hour forecast window",
            "⚡ 15-minute resolution",
            "🌍 Works worldwide",
            "📡 forecast.solar API",
          ].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      {/* ════════════════════════════════ METRICS ═════════════════════════════ */}
      <section className="metrics reveal">
        <div className="metric">
          <div className="metric-num"><Count to={99} suffix="%" />.<Count to={2} /></div>
          <div className="metric-lbl">Forecast accuracy</div>
        </div>
        <div className="metric-sep" />
        <div className="metric">
          <div className="metric-num"><Count to={48} suffix="h" /></div>
          <div className="metric-lbl">Prediction window</div>
        </div>
        <div className="metric-sep" />
        <div className="metric">
          <div className="metric-num"><Count to={15} suffix="m" /></div>
          <div className="metric-lbl">Data granularity</div>
        </div>
        <div className="metric-sep" />
        <div className="metric">
          <div className="metric-num">∞</div>
          <div className="metric-lbl">Panel configurations</div>
        </div>
      </section>

      {/* ════════════════════════════════ FEATURES ════════════════════════════ */}
      <section id="features" className="features-section">
        <div className="section-label reveal">What's inside</div>
        <h2 className="section-h2 reveal">Every tool you need.</h2>

        <div className="feat-grid">
          {[
            { icon: "◎", num: "01", title: "Map Location Picker", body: "Click anywhere on an interactive Leaflet map to set exact coordinates — no manual lat/lon entry required." },
            { icon: "▦", num: "02", title: "Smart Dashboard", body: "Today & tomorrow power curves, interval energy bars, cumulative charts — all in a single polished view." },
            { icon: "◈", num: "03", title: "Real-time KPIs", body: "Current output, peak wattage, and daily totals drawn live from your forecast data, always fresh." },
            { icon: "◧", num: "04", title: "PV System Config", body: "Dial in declination, azimuth, and installed capacity to precisely model your array." },
            { icon: "◉", num: "05", title: "Secure Accounts", body: "Passwords hashed with bcrypt, data stored server-side. Your configuration stays private." },
            { icon: "◍", num: "06", title: "Global Coverage", body: "forecast.solar irradiance data covers every coordinate on Earth with sunlight — anywhere you install." },
          ].map((f, i) => (
            <div className="feat-card reveal" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feat-top">
                <span className="feat-icon">{f.icon}</span>
                <span className="feat-num">{f.num}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════ HOW IT WORKS ════════════════════════ */}
      <section className="how-section">
        <div className="section-label reveal">Process</div>
        <h2 className="section-h2 reveal">Up and running in 3 steps.</h2>

        <div className="steps">
          {[
            { n: "1", title: "Create your account", body: "Sign up free. No credit card, no commitment. Takes 60 seconds." },
            { n: "2", title: "Configure your system", body: "Drop a pin on the map, set your panel's tilt angle, azimuth, and capacity in kWp." },
            { n: "3", title: "Read your forecast", body: "Your personal dashboard loads instantly with today's and tomorrow's full production curves." },
          ].map((s, i) => (
            <div className="step reveal" key={i}>
              <div className="step-num">{s.n}</div>
              <div className="step-line" />
              <div className="step-body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="how-cta reveal">
          <Link to="/Signup" className="btn-glow">Create free account →</Link>
        </div>
      </section>

      {/* ════════════════════════════════ ABOUT ═══════════════════════════════ */}
      <section id="about" className="about-section">
        <div className="about-inner">
          <div className="about-left reveal">
            <div className="section-label">About PVForecast</div>
            <h2 className="section-h2">Built by engineers,<br />for solar owners.</h2>
            <p>
              PVForecast started as a personal project to solve a simple frustration:
              existing solar monitoring apps were either too expensive, too complex,
              or simply didn't connect panel specs to real forecast data.
            </p>
            <p>
              We built the tool we wished existed — one that takes your exact
              installation geometry, queries live meteorological data, and returns
              an honest production estimate you can actually rely on.
            </p>
            <p>
              Whether you're a homeowner with 4 panels or an engineer managing a
              commercial array, PVForecast gives you the precision insight to
              optimize self-consumption, plan battery charging, and stop guessing.
            </p>

            <div className="about-team">
              <div className="team-head">The team</div>
              <div className="team-card reveal">
                <div className="tc-avatar">YB</div>
                <div>
                  <strong>Yassine Bk</strong>
                  <span>Full-Stack Engineer · Built the entire forecast pipeline, React dashboard, and backend API from scratch.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="about-right reveal">
            <div className="about-card">
              <div className="ac-label">Platform at a glance</div>
              {[
                ["Forecast horizon",   "48 hours"],
                ["Resolution",         "15-minute intervals"],
                ["Panel types",        "Any PV configuration"],
                ["Data source",        "forecast.solar API"],
                ["Authentication",     "bcrypt password hashing"],
                ["Map engine",         "Leaflet + OpenStreetMap"],
                ["Charts",             "Recharts / SVG"],
                ["Coverage",           "Global 🌍"],
              ].map(([k, v]) => (
                <div className="ac-row" key={k}>
                  <span>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>

            <div className="about-quote reveal">
              <p>"The clouds cost me 4 kWh yesterday. Now I know before they arrive."</p>
              <span>— Early beta user, Tunisia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════ CONTACT ═════════════════════════════ */}
      <section id="contact" className="contact-section">
        <div className="contact-inner">
          <div className="contact-left reveal">
            <div className="section-label">Get in touch</div>
            <h2 className="section-h2">We'd love to<br />hear from you.</h2>
            <p>
              Questions about your setup? Feature request? Bug report?
              Reach out and we'll get back to you within a day.
            </p>

            <div className="contact-links">
              <div className="cl-item">
                <div className="cl-icon">✉</div>
                <div>
                  <strong>Email</strong>
                  <span>hello@pvforecast.app</span>
                </div>
              </div>
              <div className="cl-item">
                <div className="cl-icon">◎</div>
                <div>
                  <strong>GitHub</strong>
                  <span>github.com/pvforecast</span>
                </div>
              </div>
              <div className="cl-item">
                <div className="cl-icon">⚡</div>
                <div>
                  <strong>Response time</strong>
                  <span>Usually within 24 hours</span>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-right reveal">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════ FOOTER ══════════════════════════════ */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="logo-sun large">◉</span>
            <div>
              <div className="fb-name">PVForecast</div>
              <div className="fb-tag">Solar production intelligence</div>
            </div>
          </div>

          <div className="footer-links">
            <div className="fl-col">
              <strong>Product</strong>
              <button onClick={() => scrollTo("features")}>Features</button>
              <Link to="/Signup">Sign up free</Link>
            </div>
            <div className="fl-col">
              <strong>Company</strong>
              <button onClick={() => scrollTo("about")}>About us</button>
              <button onClick={() => scrollTo("contact")}>Contact</button>
            </div>
            <div className="fl-col">
              <strong>Account</strong>
              <Link to="/Login">Sign in</Link>
              <Link to="/Signup">Register</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 PVForecast · All rights reserved</span>
          <button className="footer-theme" onClick={toggleTheme}>
            {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
        </div>
      </footer>

    </div>
  );
}
