import axios from 'axios';

// Używamy portu 3333, na którym działa Twoje API Fastify
export const api = axios.create({
  baseURL: 'http://localhost:3333', 
});

// Interceptor: automatycznie wstrzykuje token JWT do nagłówka
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});