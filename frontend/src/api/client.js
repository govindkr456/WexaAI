import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalizes errors so components always get a readable message,
// including when the backend can't reach the database (503).
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      (err.request ? 'Could not reach the server. Is the backend running?' : err.message);
    return Promise.reject(new Error(message));
  }
);

export default client;
