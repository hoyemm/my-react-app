// src/utils/session.js
// Single source of truth for user session stored in localStorage.
const KEY = "pvf-session";

/**
 * Persist the user object after login / profile update.
 * @param {object} user — { userId, name, email, latitude, longitude, declination, azimuth, capacity }
 */
export function saveSession(user) {
  // Guard against persisting undefined / incomplete objects (fix #13)
  if (!user || !user.userId) {
    console.warn("pvf: saveSession called with invalid user object");
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // localStorage can throw in private-browsing mode with storage quota exceeded
    console.warn("pvf: could not save session");
  }
}

/**
 * Read the current session.
 * @returns {object|null}
 */
export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Destroy the session (logout).
 */
export function clearSession() {
  localStorage.removeItem(KEY);
}
