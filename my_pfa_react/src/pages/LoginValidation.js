// src/pages/LoginValidation.js
// Fix #5: only include keys when there is an actual error message,
// so the `if (errors.email || errors.password)` guard in Login.jsx
// is semantically correct (no empty-string false-negatives).
function validation(values) {
  const errors = {};

  if (!values.email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Invalid email format";
  }

  if (!values.password) {
    errors.password = "Password is required";
  }

  return errors;
}

export default validation;
