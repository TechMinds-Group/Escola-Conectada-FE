export const environment = {
  production: import.meta.env.NG_APP_PRODUCTION === 'true',
  apiUrl: import.meta.env.NG_APP_API_URL ? `${import.meta.env.NG_APP_API_URL}/api` : '/api',
};
