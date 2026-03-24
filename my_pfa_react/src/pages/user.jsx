// src/pages/User.jsx
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./User.css";

export default function User() {
  const location = useLocation();
  const {
    name,
    latitude,
    longitude,
    declination,
    azimuth,
    capacity,
  } = location.state || {};

  const [forecastData, setForecastData] = useState([]);
  const [todayProduction, setTodayProduction] = useState(0);
  const [currentPower, setCurrentPower] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchForecast() {
      if (
        latitude == null ||
        longitude == null ||
        declination == null ||
        azimuth == null ||
        capacity == null
      ) {
        setError("Missing user PV data");
        setLoading(false);
        return;
      }

      try {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const dec = parseFloat(declination);
        const az = parseFloat(azimuth);
        const kwp = parseFloat(capacity);

        const res = await axios.get(
          `http://localhost:3001/forecast/${lat}/${lon}/${dec}/${az}/${kwp}`
        );

        if (!res.data.result || !res.data.result.watts) {
          setError("Forecast API returned invalid data");
          setLoading(false);
          return;
        }

        const wattsData = res.data.result.watts;
        const wattHoursDay = res.data.result.watt_hours_day;

        // Prepare chart data
        const chartData = Object.entries(wattsData).map(([time, watts]) => ({
          time: time.slice(11, 16), // HH:MM
          watts: Math.round(watts),
        }));

        setForecastData(chartData);

        // Today's production in kWh
        const today = new Date().toISOString().slice(0, 10);
        const todayWh = wattHoursDay[today] || 0;
        setTodayProduction((todayWh / 1000).toFixed(2));

        // Current power: nearest past hour
        const now = new Date();
        const nowTime = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        let nearestTime = null;
        Object.keys(wattsData).forEach((t) => {
          if (t <= nowTime) nearestTime = t;
        });
        const currentWatts = nearestTime ? wattsData[nearestTime] : 0;
        setCurrentPower((currentWatts / 1000).toFixed(2));

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch forecast");
        setLoading(false);
      }
    }

    fetchForecast();
  }, [latitude, longitude, declination, azimuth, capacity]);

  return (
    <div className="user-container">
      <header className="user-header">
        <h1>Welcome, {name || "User"}!</h1>
        <p>Your PV system dashboard</p>
      </header>

      {loading ? (
        <p>Loading forecast data...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <>
          <section className="summary-cards">
            <div className="card">
              <h3>Today's Production</h3>
              <p>{todayProduction} kWh</p>
            </div>
            <div className="card">
              <h3>Current Power</h3>
              <p>{currentPower} kW</p>
            </div>
          </section>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: "Watts", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Line type="monotone" dataKey="watts" stroke="#82ca9d" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="user-buttons">
        <Link to="/"><button className="btn btn-green">Home</button></Link>
      </div>
    </div>
  );
}