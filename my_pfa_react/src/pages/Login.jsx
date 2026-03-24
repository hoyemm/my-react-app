// src/pages/Login.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import './Login.css';
import validation from './LoginValidation';
import axios from 'axios';

function LoginPage() {
    const [values , setValues] = useState({
        email: "",
        password: "",
    })
    const [errors , setErrors] = useState({})
    const [loginError, setLoginError] = useState(""); // frontend error
    const navigate = useNavigate();

    const handleInput = (e) => {
        setValues(prev => ({...prev, [e.target.name]: e.target.value}))
        setLoginError("");
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = validation(values);
        setErrors(validationErrors);

        if (!validationErrors.email && !validationErrors.password) {
            axios.post("http://localhost:3001/login", values)
                .then(res => {
                    console.log("Login response:", res.data);
                    if (res.data.success) {
                        navigate("/User", { state: { 
                            userId: res.data.userId, 
                            name: res.data.name,
                            latitude: res.data.latitude,
                            longitude: res.data.longitude,
                            declination: res.data.declination,
                            azimuth: res.data.azimuth,
                            capacity: res.data.capacity
                        }});
                    }
                })
                .catch(err => {
                    if (err.response && err.response.status === 401) {
                        setLoginError("Email or password is incorrect");
                    } else {
                        console.error(err);
                        setLoginError("Something went wrong, try again");
                    }
                });
        }
    }; 

    return (
        <div className="login-container">
          <h2>Login</h2>
          <form onSubmit={handleSubmit}>
            <input type="email" name="email" onChange={handleInput} className="form-control" placeholder="Email" />
            {errors.email && <span className="text-danger">{errors.email}</span>}

            <input type="password" name="password" onChange={handleInput} className="form-control" placeholder="Password" />
            {errors.password && <span className="text-danger">{errors.password}</span>}

            {loginError && <span className="text-danger">{loginError}</span>}

            <button type="submit" className="btn btn-primary">Login</button>
          </form>
          <Link to="/signup" className="account-link">Don't have an account? Sign Up</Link>
          <Link to="/" className="home-btn">Home</Link>
        </div>
    );
} 

export default LoginPage;