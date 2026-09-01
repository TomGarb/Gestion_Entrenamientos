import axios from 'axios';

const api = axios.create({
  // Utiliza la variable de entorno en producción (ej. Render), y localhost en desarrollo local
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true, // Fundamental para manejar cookies de sesión o JWT con FastAPI
  headers: {
    'Content-Type': 'application/json'
  }
});

// Aquí podremos añadir interceptors para inyectar tokens o manejar errores globales 401
export default api;
