// src/hooks/useTheme.js
// Extracted from Login/User/Profile/Home to eliminate duplication.
import { useState, useEffect } from "react";

export default function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("pvf-theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pvf-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));
  return [theme, toggle];
}
