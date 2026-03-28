// src/pages/SignupValidation.js
// Fix #3: use explicit parseFloat so whitespace strings like " " don't
// bypass the numeric range checks via loose coercion.
function validation(values) {
  const errors = {};

  // Name
  if (!values.name || !values.name.trim())
    errors.name = "Full name is required";

  // Email
  if (!values.email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Invalid email format";
  }

  // Password
  if (!values.password) {
    errors.password = "Password is required";
  } else if (values.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  // PV system — all parsed explicitly to numbers before comparisons
  const dec = parseFloat(values.declination);
  const az  = parseFloat(values.azimuth);
  const lat = parseFloat(values.latitude);
  const lng = parseFloat(values.longitude);
  const cap = parseFloat(values.capacity);

  if (values.declination === "" || isNaN(dec) || dec < 0 || dec > 90)
    errors.declination = "Declination must be 0–90°";
  if (values.azimuth === "" || isNaN(az) || az < -180 || az > 180)
    errors.azimuth = "Azimuth must be -180–180°";
  if (values.latitude === "" || isNaN(lat) || lat < -90 || lat > 90)
    errors.latitude = "Latitude must be -90–90°";
  if (values.longitude === "" || isNaN(lng) || lng < -180 || lng > 180)
    errors.longitude = "Longitude must be -180–180°";
  if (!values.capacity || isNaN(cap) || cap <= 0)
    errors.capacity = "PV Capacity must be a positive number";

  return errors;
}

export default validation;
