// src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// ✅ Request Interceptor: Attach token to every outgoing request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// (already present) Response Interceptor: Catch 401s
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(error);
  }
);

export default api;
