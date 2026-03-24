// src/pages/Signup.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import './Signup.css';
import validation from './SignupValidation';

function SignupPage() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    declination: "",
    azimuth: "",
    latitude: "",
    longitude: "",
    capacity: ""
  });

  const [errors, setErrors] = useState({});
  const [locationError, setLocationError] = useState("");
  const [emailError, setEmailError] = useState("");
  const navigate = useNavigate();

  const handleInput = (e) => {
    setValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === "latitude" || e.target.name === "longitude") setLocationError("");
    if (e.target.name === "email") setEmailError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validation(values);
    setErrors(validationErrors);
    setLocationError("");
    setEmailError("");

    if (Object.keys(validationErrors).length === 0) {
      try {
        const res = await axios.post("http://localhost:3001/signup", values);
        console.log(res.data);

        // redirect to user dashboard with all PV info
        navigate("/User", { state: { 
          userId: res.data.userId, 
          name: values.name, 
          latitude: values.latitude, 
          longitude: values.longitude, 
          declination: values.declination,
          azimuth: values.azimuth,
          capacity: values.capacity
        }});
      } catch (err) {
        if (err.response && err.response.status === 400) {
          const msg = err.response.data.error;
          if (msg.includes("location")) setLocationError(msg);
          else if (msg.includes("Email")) setEmailError(msg);
        } else {
          console.error(err);
          setLocationError("Something went wrong. Please try again.");
        }
      }
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" onChange={handleInput} className="form-control" placeholder="Full Name" />
        {errors.name && <span className="text-danger">{errors.name}</span>}

        <input type="email" name="email" onChange={handleInput} className="form-control" placeholder="Email" />
        {errors.email && <span className="text-danger">{errors.email}</span>}
        {emailError && <span className="text-danger">{emailError}</span>}

        <input type="password" name="password" onChange={handleInput} className="form-control" placeholder="Password" />
        {errors.password && <span className="text-danger">{errors.password}</span>}

        <h3>PV System Data</h3>
        <input type="number" name="declination" onChange={handleInput} className="form-control" placeholder="Declination °" />
        {errors.declination && <span className="text-danger">{errors.declination}</span>}

        <input type="number" name="azimuth" onChange={handleInput} className="form-control" placeholder="Azimuth °" />
        {errors.azimuth && <span className="text-danger">{errors.azimuth}</span>}

        <input type="number" name="latitude" onChange={handleInput} className="form-control" placeholder="Latitude °" />
        {errors.latitude && <span className="text-danger">{errors.latitude}</span>}
        {locationError && <span className="text-danger">{locationError}</span>}

        <input type="number" name="longitude" onChange={handleInput} className="form-control" placeholder="Longitude °" />
        {errors.longitude && <span className="text-danger">{errors.longitude}</span>}

        <input type="number" name="capacity" onChange={handleInput} className="form-control" placeholder="PV Capacity (kW)" />
        {errors.capacity && <span className="text-danger">{errors.capacity}</span>}

        <button type="submit" className="btn btn-success">Sign Up</button>
      </form>
      <Link to="/" className="home-btn">Home</Link>
    </div>
  );
}

export default SignupPage;