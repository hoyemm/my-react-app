function validation(values) {
  let errors = {};

  // Email validation
  if (!values.email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Invalid email format";
  } else {
    errors.email = "";
  }

  // Password validation
  if (!values.password) {
    errors.password = "Password is required";
  }else {
    errors.password = "";
  }

  return errors;
}

export default validation;