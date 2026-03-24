// src/pages/SignupValidation.js
function validation(values) {
  let errors = {};

  // Name validation
  if (!values.name) errors.name = "Full name is required";

  // Email validation
  if (!values.email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Invalid email format";
  }

  // Password validation
  if (!values.password) {
    errors.password = "Password is required";
  } else if (values.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  // PV system validation
  if (values.declination === "" || values.declination < 0 || values.declination > 90)
    errors.declination = "Declination must be 0–90°";
  if (values.azimuth === "" || values.azimuth < -180 || values.azimuth > 180)
    errors.azimuth = "Azimuth must be -180–180°";
  if (values.latitude === "" || values.latitude < -90 || values.latitude > 90)
    errors.latitude = "Latitude must be -90–90°";
  if (values.longitude === "" || values.longitude < -180 || values.longitude > 180)
    errors.longitude = "Longitude must be -180–180°";
  if (!values.capacity || values.capacity <= 0)
    errors.capacity = "PV Capacity must be a positive number";

  return errors;
}

export default validation;