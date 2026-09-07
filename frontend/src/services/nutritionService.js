import api from './api';

/**
 * Obtiene el resumen nutricional diario (calorías consumidas, quemadas en entreno, netas y macros).
 * @param {string} [date] - Formato YYYY-MM-DD (opcional, defaults to hoy)
 */
export const getDailyNutrition = async (date = null) => {
  const params = date ? { date } : {};
  const response = await api.get('/api/nutrition/daily', { params });
  return response.data;
};

/**
 * Registra un alimento consumido en la base de datos.
 * @param {Object} foodData
 */
export const logFood = async (foodData) => {
  const response = await api.post('/api/nutrition/log', foodData);
  return response.data;
};

/**
 * Elimina un alimento registrado previamente.
 * @param {number} logId
 */
export const deleteFoodLog = async (logId) => {
  const response = await api.delete(`/api/nutrition/log/${logId}`);
  return response.data;
};

/**
 * Consulta un producto por código de barras en OpenFoodFacts a través del backend.
 * @param {string} barcode
 */
export const searchFoodByBarcode = async (barcode) => {
  const response = await api.get(`/api/nutrition/barcode/${encodeURIComponent(barcode)}`);
  return response.data;
};

/**
 * Busca productos por nombre/texto en OpenFoodFacts.
 * @param {string} query
 */
export const searchFoodByQuery = async (query) => {
  const response = await api.get('/api/nutrition/search', {
    params: { q: query }
  });
  return response.data;
};
