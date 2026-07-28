import axios from 'axios';

const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || '/api/v1';
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (url.startsWith('http') && !url.includes('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
};

const API_BASE_URL = getBaseUrl();
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if ((err.response?.status === 502 || !err.response) && !original._networkRetry) {
      original._networkRetry = true;
      await new Promise((r) => setTimeout(r, 1000));
      return api(original);
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem('access_token', data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch { /* refresh failed */ }
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
