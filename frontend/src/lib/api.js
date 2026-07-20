import axios from "axios";

// Single source of truth for the backend origin. Falls back to localhost in dev
// so a missing env var never produces an "undefined/api" URL.
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

// Resolve a stored media path (e.g. "/uploads/..") to an absolute URL.
// Absolute URLs (Google profile pictures) are returned unchanged.
export const mediaUrl = (path) =>
  !path ? "" : path.startsWith("http") ? path : `${BACKEND_URL}${path}`;

const TOKEN_KEY = "lumina_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const api = axios.create({
  baseURL: API,
  withCredentials: true, // send session_token cookie for Google auth
});

api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
