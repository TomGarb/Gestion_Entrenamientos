import api from './api';

/**
 * Consulta estadísticas de registros disponibles para exportar.
 */
export const getExportStats = async () => {
  const response = await api.get('/api/export/stats');
  return response.data;
};

/**
 * Descarga directamente un archivo exportado (CSV o JSON) en el navegador del usuario.
 * @param {string} type - 'workouts' | 'nutrition' | 'summary' | 'backup'
 * @param {string} format - 'csv' | 'json'
 * @param {string} period - 'all' | '30d' | '90d' | 'year'
 */
export const downloadExport = async (type = 'workouts', format = 'csv', period = 'all') => {
  let endpoint = `/api/export/${type}`;
  const params = { format, period };

  if (type === 'backup') {
    endpoint = '/api/export/backup';
  }

  const response = await api.get(endpoint, {
    params,
    responseType: 'blob',
  });

  // Extraer nombre del archivo del header o generar uno por defecto
  let filename = `gymtracker_${type}_${new Date().toISOString().slice(0, 10)}.${format}`;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  // Crear enlace temporal de descarga
  const blob = new Blob([response.data], {
    type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;',
  });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return filename;
};
