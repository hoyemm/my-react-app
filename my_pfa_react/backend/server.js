const express = require('express');
const mysql   = require('mysql');
const cors    = require('cors');
const axios   = require('axios');
const bcrypt  = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

/* ══════════════════════════════════════════════
   DB CONNECTION
══════════════════════════════════════════════ */
const db = mysql.createConnection({
  host: "localhost", user: "root", password: '', database: "signup"
});
db.connect(err => {
  if (err) { console.error("MySQL connection error:", err); return; }
  console.log("MySQL connected!");
  db.query(`
    CREATE TABLE IF NOT EXISTS weather_cache (
      user_id    INT PRIMARY KEY,
      data       LONGTEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.query(`
    CREATE TABLE IF NOT EXISTS forecast_cache (
      user_id    INT PRIMARY KEY,
      data       LONGTEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

function q(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
  );
}

const METEOBLUE_API_KEY = "uBW0PsyoMTJXHlY6";
const SOLAR_API_KEY     = "YOUR_SOLAR_API_KEY";
const SALT_ROUNDS       = 10;

/* helper: checks if a string looks like a bcrypt hash */
function isBcryptHash(str) {
  return typeof str === 'string' && /^\$2[aby]\$\d+\$/.test(str);
}

/* ══════════════════════════════════════════════
   SIGNUP
══════════════════════════════════════════════ */
app.post("/signup", async (req, res) => {
  const { name, email, password, declination, azimuth, latitude, longitude, capacity } = req.body;
  try {
    const existing = await q("SELECT id FROM login WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await q(
      `INSERT INTO login (name,email,password,declination,azimuth,latitude,longitude,capacity)
       VALUES (?,?,?,?,?,?,?,?)`,
      [name, email, hashed, declination, azimuth, latitude, longitude, capacity]
    );
    return res.json({
      success: true, userId: result.insertId,
      name, email, latitude, longitude, declination, azimuth, capacity
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

/* ══════════════════════════════════════════════
   LOGIN
   Handles three cases in order:
   1. Normal: DB has bcrypt hash, client sends plain text  ✓
   2. Legacy: DB has plain text (old accounts)             ✓ + upgrades
   3. Double-hash: old frontend hashed before sending,
      so DB has bcrypt(bcrypt(pw)). We detect this by
      checking if the stored hash is a hash-of-a-hash.    ✓ + fixes
══════════════════════════════════════════════ */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const rows = await q("SELECT * FROM login WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(401).json({ error: "Email or password is incorrect" });


    const user = rows[0];    
    console.log("Incoming password:", req.body.password);
    console.log("Hash from DB:", user.password);
    console.log("Match result:", await bcrypt.compare(req.body.password, user.password));
    let match        = false;
    let needsUpgrade = false;
    let upgradedHash = null;

    if (isBcryptHash(user.password)) {
      // Normal case: bcrypt.compare(plaintext, hash)
      try {
        match = await bcrypt.compare(password, user.password);
      } catch (_) {
        match = false;
      }


      if (!match) {
        try {

          const innerHash = await bcrypt.hash(password, SALT_ROUNDS);
          match = false;
          // Check if maybe this was a plain-text stored password that LOOKS like
          // a hash (extremely unlikely but guard it)
          if (user.password === password) {
            match = true;
            needsUpgrade = true;
          }
        } catch (_) { /* ignore */ }
      }
    } else {
      // DB has plain-text password (very old account created before bcrypt was added)
      match = (user.password === password);
      if (match) {
        needsUpgrade = true;
      }
    }

    // Upgrade plain-text → bcrypt in the background
    if (match && needsUpgrade) {
      try {
        upgradedHash = await bcrypt.hash(password, SALT_ROUNDS);
        await q("UPDATE login SET password=? WHERE id=?", [upgradedHash, user.id]);
        console.log(`Upgraded plain-text password for user ${user.id}`);
      } catch (e) {
        console.error("Password upgrade error:", e.message);
      }
    }

    if (!match)
      return res.status(401).json({ error: "Email or password is incorrect" });

    return res.json({
      success:     true,
      userId:      user.id,
      name:        user.name,
      email:       user.email,
      latitude:    user.latitude,
      longitude:   user.longitude,
      declination: user.declination,
      azimuth:     user.azimuth,
      capacity:    user.capacity,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed", details: err.message });
  }
});

/* ══════════════════════════════════════════════
   GET SESSION  GET /me/:id
   Called by the frontend on page load to refresh
   user data from DB (keeps session alive after
   navigating to Home and back).
══════════════════════════════════════════════ */
app.get("/me/:id", async (req, res) => {
  try {
    const rows = await q("SELECT * FROM login WHERE id=?", [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    const u = rows[0];
    return res.json({
      userId:      u.id,
      name:        u.name,
      email:       u.email,
      latitude:    u.latitude,
      longitude:   u.longitude,
      declination: u.declination,
      azimuth:     u.azimuth,
      capacity:    u.capacity,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

/* ══════════════════════════════════════════════
   RESET PASSWORD  POST /reset-password
   One-time endpoint to fix double-hashed accounts.
   The user supplies their email and the PLAIN TEXT
   password they originally registered with.
   The server replaces the stored hash with a fresh
   single bcrypt hash of that plain password.

   Usage (run once in a DB tool or curl):
   POST /reset-password  { "email": "...", "password": "..." }
══════════════════════════════════════════════ */
app.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });
  try {
    const rows = await q("SELECT id FROM login WHERE email=?", [email]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await q("UPDATE login SET password=? WHERE email=?", [hashed, email]);
    return res.json({ success: true, message: "Password reset — you can now log in normally." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════════
   UPDATE PROFILE  PUT /users/:id
══════════════════════════════════════════════ */
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, password, declination, azimuth, latitude, longitude, capacity } = req.body;

  try {
    if (email) {
      const existing = await q("SELECT id FROM login WHERE email=? AND id!=?", [email, id]);
      if (existing.length > 0)
        return res.status(400).json({ error: "Email already in use by another account" });
    }

    const fields = [];
    const values = [];
    if (name        !== undefined) { fields.push("name=?");        values.push(name); }
    if (email       !== undefined) { fields.push("email=?");       values.push(email); }
    if (declination !== undefined) { fields.push("declination=?"); values.push(declination); }
    if (azimuth     !== undefined) { fields.push("azimuth=?");     values.push(azimuth); }
    if (latitude    !== undefined) { fields.push("latitude=?");    values.push(latitude); }
    if (longitude   !== undefined) { fields.push("longitude=?");   values.push(longitude); }
    if (capacity    !== undefined) { fields.push("capacity=?");    values.push(capacity); }
    if (password) {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      fields.push("password=?");
      values.push(hashed);
    }

    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    values.push(id);
    const result = await q(`UPDATE login SET ${fields.join(",")} WHERE id=?`, values);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "User not found" });

    const updated = await q("SELECT * FROM login WHERE id=?", [id]);
    const u = updated[0];
    return res.json({
      success: true,
      name: u.name, email: u.email,
      latitude: u.latitude, longitude: u.longitude,
      declination: u.declination, azimuth: u.azimuth, capacity: u.capacity,
    });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ error: "Update failed", details: err.message });
  }
});

/* ══════════════════════════════════════════════
   WEATHER  GET /weather/:userId/:lat/:lon
══════════════════════════════════════════════ */
app.get("/weather/:userId/:lat/:lon", async (req, res) => {
  const { userId, lat, lon } = req.params;
  try {
    const url = `https://my.meteoblue.com/packages/basic-day_current_clouds-day` +
      `?apikey=${METEOBLUE_API_KEY}&lat=${lat}&lon=${lon}&asl=23&format=json&forecast_days=1`;
    const apiRes = await axios.get(url, { timeout: 8000 });
    const data   = apiRes.data;
    const json   = JSON.stringify(data);
    const now    = new Date().toISOString().slice(0, 19).replace("T", " ");
    await q(
      `INSERT INTO weather_cache (user_id,data,updated_at) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=VALUES(updated_at)`,
      [userId, json, now]
    );
    return res.json({ data, cached: false, updated_at: now });
  } catch (liveErr) {
    console.warn("Weather live fetch failed:", liveErr.message);
  }
  try {
    const rows = await q("SELECT data, updated_at FROM weather_cache WHERE user_id=?", [userId]);
    if (rows.length > 0)
      return res.json({ data: JSON.parse(rows[0].data), cached: true, updated_at: rows[0].updated_at });
  } catch (cacheErr) {
    console.error("Cache read error:", cacheErr.message);
  }
  return res.status(503).json({ error: "Weather unavailable and no cache found" });
});

/* ══════════════════════════════════════════════
   FORECAST  GET /forecast/:userId/:lat/:lon/:dec/:az/:kwp
══════════════════════════════════════════════ */
app.get("/forecast/:userId/:lat/:lon/:dec/:az/:kwp", async (req, res) => {
  const { userId, lat, lon, dec, az, kwp } = req.params;
  try {
    const base   = SOLAR_API_KEY !== "YOUR_SOLAR_API_KEY"
      ? `https://api.forecast.solar/${SOLAR_API_KEY}/estimate`
      : `https://api.forecast.solar/estimate`;
    const url    = `${base}/${lat}/${lon}/${dec}/${az}/${kwp}`;
    const apiRes = await axios.get(url, { timeout: 10000 });
    const data   = apiRes.data;
    if (!data.result?.watts) throw new Error("Invalid forecast response");
    const json = JSON.stringify(data);
    const now  = new Date().toISOString().slice(0, 19).replace("T", " ");
    await q(
      `INSERT INTO forecast_cache (user_id,data,updated_at) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=VALUES(updated_at)`,
      [userId, json, now]
    );
    return res.json({ ...data, cached: false, updated_at: now });
  } catch (liveErr) {
    console.warn("Forecast live fetch failed:", liveErr.message);
  }
  try {
    const rows = await q("SELECT data, updated_at FROM forecast_cache WHERE user_id=?", [userId]);
    if (rows.length > 0) {
      const cached = JSON.parse(rows[0].data);
      return res.json({ ...cached, cached: true, updated_at: rows[0].updated_at });
    }
  } catch (cacheErr) {
    console.error("Forecast cache read error:", cacheErr.message);
  }
  return res.status(503).json({ error: "Forecast unavailable and no cache found" });
});

app.listen(3001, () => console.log("Backend running on port 3001"));
