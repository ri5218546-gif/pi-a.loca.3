/*
  Configuración de la API para despliegue en la nube.

  - Si tu backend Flask se publica en un host distinto, coloca aquí la URL completa.
  - Si el frontend y el backend se despliegan juntos en el mismo dominio, deja este valor vacío.
  IMPORTANTE: si tu frontend está en la nube y el backend está en otra URL,
  debes definir aquí la URL pública del backend.
  Ejemplo:
    window.API_BASE_URL = 'https://mi-backend-ejemplo.com';
*/

window.API_BASE_URL = window.API_BASE_URL || '';
