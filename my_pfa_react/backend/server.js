// backend/server.js
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');

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

// Your Forecast.Solar API key
const FORECAST_API_KEY = "YOUR_API_KEY_HERE"; // <<< Replace with your key

// SIGNUP
app.post("/signup", (req, res) => {
    const { name, email, password, declination, azimuth, latitude, longitude, capacity } = req.body;
    console.log("Received signup data:", req.body);

    // Check if email exists
    db.query("SELECT * FROM login WHERE email = ?", [email], async (err, existing) => {
        if (err) return res.status(500).json({ error: "Database query failed", details: err });

        if (existing.length > 0) return res.status(400).json({ error: "Email already exists" });

        // Validate location via API
        try {
            const locRes = await axios.get(`https://api.forecast.solar/check/${latitude}/${longitude}`, {
                headers: { Authorization: `Bearer ${FORECAST_API_KEY}` }
            });

            if (!locRes.data || locRes.data.message.code !== 0) {
                return res.status(400).json({ error: "Invalid location" });
            }
        } catch (err) {
            console.error("Location API error:", err.message);
            return res.status(400).json({ error: "Invalid location" });
        }

        // Insert user
        const q = `INSERT INTO login 
            (name, email, password, declination, azimuth, latitude, longitude, capacity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(q, [name, email, password, declination, azimuth, latitude, longitude, capacity], (err, result) => {
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
    console.log("Login attempt:", req.body);

    const q = "SELECT * FROM login WHERE email = ? AND password = ?";
    db.query(q, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: "Database query failed" });
        if (results.length === 0) return res.status(401).json({ error: "Email or password is incorrect" });

        const user = results[0];
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

// Forecast endpoint proxy
app.get("/forecast/:lat/:lon/:dec/:az/:kwp", async (req, res) => {
    const { lat, lon, dec, az, kwp } = req.params;

    try {
        const apiRes = await axios.get(
            `https://api.forecast.solar/estimate/${lat}/${lon}/${dec}/${az}/${kwp}`,
            {
                headers: { Authorization: `Bearer ${FORECAST_API_KEY}` }
            }
        );

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

app.listen(3001, () => console.log("Connected to backend on port 3001!"));