const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: '',
    database: "signup"
});

db.connect(err => {
    if (err) console.error("MySQL error:", err);
    else console.log("MySQL connected!");
});

const FORECAST_API_KEY = "YOUR_API_KEY_HERE";
const SALT_ROUNDS = 10;

// SIGNUP
app.post("/signup", async (req, res) => {
    const { name, email, password, declination, azimuth, latitude, longitude, capacity } = req.body;

    db.query("SELECT * FROM login WHERE email = ?", [email], async (err, existing) => {
        if (err) return res.status(500).json({ error: "Database query failed", details: err });
        if (existing.length > 0) return res.status(400).json({ error: "Email already exists" });

        // Validate location via forecast.solar (skip if no API key set)
        if (FORECAST_API_KEY !== "YOUR_API_KEY_HERE") {
            try {
                const locRes = await axios.get(`https://api.forecast.solar/check/${latitude}/${longitude}`, {
                    headers: { Authorization: `Bearer ${FORECAST_API_KEY}` }
                });
                if (!locRes.data || locRes.data.message?.code !== 0) {
                    return res.status(400).json({ error: "Invalid location" });
                }
            } catch (err) {
                console.error("Location API error:", err.message);
                return res.status(400).json({ error: "Invalid location" });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const q = `INSERT INTO login 
            (name, email, password, declination, azimuth, latitude, longitude, capacity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(q, [name, email, hashedPassword, declination, azimuth, latitude, longitude, capacity], (err, result) => {
            if (err) return res.status(500).json({ error: "Database insert failed", details: err });
            return res.json({
                success: true,
                userId: result.insertId,
                name, latitude, longitude, declination, azimuth, capacity
            });
        });
    });
});

// LOGIN
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const q = "SELECT * FROM login WHERE email = ?";
    db.query(q, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database query failed" });
        if (results.length === 0) return res.status(401).json({ error: "Email or password is incorrect" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Email or password is incorrect" });

        return res.json({
            success: true,
            userId: user.id,
            name: user.name,
            latitude: user.latitude,
            longitude: user.longitude,
            declination: user.declination,
            azimuth: user.azimuth,
            capacity: user.capacity
        });
    });
});

// UPDATE PROFILE
app.put("/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, password, declination, azimuth, latitude, longitude, capacity } = req.body;

    // Check if email is taken by another user
    db.query("SELECT * FROM login WHERE email = ? AND id != ?", [email, id], async (err, existing) => {
        if (err) return res.status(500).json({ error: "Database query failed" });
        if (existing.length > 0) return res.status(400).json({ error: "Email already in use by another account" });

        let q, params;

        if (password) {
            // Update with new password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            q = `UPDATE login SET name=?, email=?, password=?, declination=?, azimuth=?, latitude=?, longitude=?, capacity=? WHERE id=?`;
            params = [name, email, hashedPassword, declination, azimuth, latitude, longitude, capacity, id];
        } else {
            // Update without touching password
            q = `UPDATE login SET name=?, email=?, declination=?, azimuth=?, latitude=?, longitude=?, capacity=? WHERE id=?`;
            params = [name, email, declination, azimuth, latitude, longitude, capacity, id];
        }

        db.query(q, params, (err, result) => {
            if (err) return res.status(500).json({ error: "Database update failed", details: err });
            if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
            return res.json({ success: true, name, latitude, longitude, declination, azimuth, capacity });
        });
    });
});

// FORECAST PROXY
app.get("/forecast/:lat/:lon/:dec/:az/:kwp", async (req, res) => {
    const { lat, lon, dec, az, kwp } = req.params;
    try {
        const url = FORECAST_API_KEY !== "YOUR_API_KEY_HERE"
            ? `https://api.forecast.solar/${FORECAST_API_KEY}/estimate/${lat}/${lon}/${dec}/${az}/${kwp}`
            : `https://api.forecast.solar/estimate/${lat}/${lon}/${dec}/${az}/${kwp}`;

        const apiRes = await axios.get(url);
        const data = apiRes.data;

        if (!data.result || !data.result.watts) {
            return res.status(400).json({ error: "Forecast API returned invalid data", raw: data });
        }
        res.json(data);
    } catch (err) {
        console.error("Forecast API error:", err.message);
        res.status(500).json({ error: "Failed to fetch forecast", details: err.message });
    }
});

app.listen(3001, () => console.log("Backend running on port 3001"));
