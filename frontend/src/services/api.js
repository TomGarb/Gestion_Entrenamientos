import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true, // Fundamental para manejar cookies de sesión o JWT con FastAPI
  headers: {
    'Content-Type': 'application/json'
  }
});

// Aquí podremos añadir interceptors para inyectar tokens o manejar errores globales 401
export default api;
