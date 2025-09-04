import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn("⚠️ VITE_API_URL is not defined. Check your .env file.");
} else {
  console.log("✅ Loaded VITE_API_URL:", API_URL);
}

const api = axios.create({
  baseURL: API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export const API_BASE_URL = API_URL || "http://localhost:8000"; // Add this