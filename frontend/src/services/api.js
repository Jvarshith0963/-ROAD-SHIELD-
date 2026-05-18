import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  timeout: 10_000,
});

api.interceptors.response.use(
  (r) => r.data,
  (err) => {
    const msg = err.response?.data?.error?.message || err.message || "Network error";
    return Promise.reject(new Error(msg));
  }
);

export const speedApi = {
  check: (payload)  => api.post("/speed-check", payload),
  history: (params) => api.get("/speed-check/history", { params }),
};

export const weatherApi = {
  get: (lat, lon, bearing = 0) =>
    api.get("/weather", { params: { lat, lon, bearing } }),
};

export const alertsApi = {
  list: (params) => api.get("/alerts", { params }),
  ack:  (id)     => api.patch(`/alerts/${id}/ack`),
};

export const healthApi = {
  check: () => api.get("/health"),
};

export default api;
