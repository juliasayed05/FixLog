import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'The request took too long. Please try again.' : 'Unable to reach FixLog. Check your connection and API server.');
    error.userMessage = message;
    return Promise.reject(error);
  },
);

export default http;
