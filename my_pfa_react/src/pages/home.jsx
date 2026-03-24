  // src/pages/Home.jsx
  import { Link } from "react-router-dom";
  import './Home.css';

  export default function Home() {
    return (
      <div className="home-container">
        
        {/* Hero section */}
        <header className="hero">
          <h1>Welcome to PV Production Forecast</h1>
          <p>Predict your solar energy production and optimize your PV system with ease.</p>
        </header>

        {/* Feature highlights */}
        <section className="features">
          <div className="feature-card">
            <h3>Easy Setup</h3>
            <p>Add your PV system and start predicting in seconds.</p>
          </div>
          <div className="feature-card">
            <h3>Accurate Forecasts</h3>
            <p>Get reliable predictions based on your system and location.</p>
          </div>
          <div className="feature-card">
            <h3>User Dashboard</h3>
            <p>View your PV performance and track predictions easily.</p>
          </div>
        </section>

        {/* Call-to-action buttons */}
        <div className="cta-buttons">
          <Link to="/Login"><button className="btn btn-blue">Login</button></Link>
        </div>

        <footer className="footer">
          &copy; 2026 PV Production Forecast. All rights reserved.
        </footer>
      </div>
    );
  }