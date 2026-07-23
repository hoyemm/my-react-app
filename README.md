# PV Forecast Web Platform

A personalized photovoltaic (solar) production forecasting web app. Users register their real PV installation (location, tilt, azimuth, capacity, panel type...), and the platform generates hourly/daily power forecasts using live weather data and physics-based solar models — no historical training data required.

End-of-year project — ENET'COM, 2025-2026.

## Features

- **Account & installation setup** — multi-step sign-up (account info, location on map, PV system specs, mounting/inverter details)
- **Weather dashboard** — live hourly temperature and solar irradiance (GHI) via Open-Meteo
- **Forecast dashboard** — today/tomorrow energy forecast, current output, peak power, AC power curve
- **Interactive charts** — hourly energy, cumulative energy, GHI, POA irradiance, cell temperature, ambient temperature, with CSV export
- **Profile editing** — update PV system parameters anytime; forecasts reflect changes on next refresh
- **Two forecasting methods** — a `forecast.solar` API-based model and an in-house analytical model (physics-based, using Open-Meteo weather data) — see [Methodology](#methodology)

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React (Vite), React Router, Recharts, Leaflet / React-Leaflet, Axios |
| Backend    | Node.js, Express |
| Database   | MySQL |
| Auth       | bcrypt (password hashing) |
| Weather data | Open-Meteo API |
| Solar forecast | forecast.solar API (comparison method) + custom analytical model |


## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MySQL server running locally

### 1. Database
Create a MySQL database named `signup`. The backend will create the required tables automatically on first connection.

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (see [Environment Variables](#environment-variables)), then:

```bash
npm start
```

The API runs on `http://localhost:3001`.

### 3. Frontend

```bash
npm install
npm run dev
```

The app runs on the Vite dev server (default `http://localhost:5173`).

To point the frontend at a different backend URL, set `VITE_API_URL` when building:

```bash
VITE_API_URL=https://your-server.com npm run build
```

## Environment Variables

The backend currently has some configuration values hardcoded in `server.js` (DB credentials, weather API key). Before deploying or sharing this repo, move these into a `.env` file and load them with `dotenv`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=signup
METEOBLUE_API_KEY=your_key_here
SOLAR_API_KEY=your_key_here
```

**Note:** an API key is currently committed in plain text in `backend/server.js`. Treat it as compromised — regenerate/rotate it, then load it from `.env` instead (see [Known Issues](#known-issues--suggested-fixes) below).

## Methodology

Two forecasting approaches were implemented and compared against real inverter measurements (Sfax, 3 kWp polycrystalline system):

- **forecast.solar API** — physics-based and personalizable per installation, but relies on a generic clear-sky model with no local calibration → nMAPE ≈ 20%, R² ≈ 0.4-0.45 (Acceptable/Good).
- **Analytical model + Open-Meteo** — uses real local weather (shortwave radiation, ambient temperature) with a physical PV model (SAM/NOCT cell-temperature model, IEC 61724-compliant capacity-normalized error metrics) → nMAPE ≈ 5.7-6.7%, R² ≈ 0.93-0.95 (Excellent).

The analytical + Open-Meteo method is the more accurate of the two and is the platform's primary forecasting engine.

## Future Improvements

- Historical tracking of forecast vs. actual performance
- Household consumption forecasting
- Battery & storage simulation
- Financial analysis (savings, payback period)

## Known Issues / Suggested Fixes

A few things worth cleaning up before this goes further:

1. **Import case-sensitivity bug** — `App.jsx` imports `./pages/Home`, `./pages/Signup`, `./pages/User`, but the actual files are `home.jsx`, `signup.jsx`, `user.jsx` (lowercase). This works on Windows/macOS but **will fail to build on case-sensitive filesystems** (Linux, most CI/CD, Docker, Vercel/Netlify). Fix: rename the files to match the imports (or vice versa) consistently.
2. **Hardcoded secrets in `server.js`** — the Meteoblue API key is committed in plain text. Move all secrets to a `.env` file (gitignored) and load with `dotenv`.
3. **Plaintext password logging** — the login route currently logs the incoming password and password hash to the console for debugging. Remove these `console.log` calls before deploying.
4. **`node_modules` committed to git** — the repository root has no `.gitignore`, so `node_modules/` (thousands of files) got committed at the top level. Add a root `.gitignore` with `node_modules` and `dist`, then run `git rm -r --cached node_modules` to untrack it.
5. **Stray root `package.json`** — there's a `package.json` at the repo root (outside `my_pfa_react/`) with a handful of dependencies that don't belong there (likely from an accidental `npm install` in the wrong folder). Worth removing if unused.

## Team

- **Presented by:** Zghal Samar, Hoyem Ben Jmeaa
- **Supervised by:** Dr. Taouil Khaled
- **President:** Pr. Chaabene Maher
