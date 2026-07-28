import axios from 'axios';

export const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api/v1';
  let clean = envUrl.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api/v1')) {
    clean = `${clean}/api/v1`;
  }
  return clean;
};

export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = getBaseUrl();
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const origin = new URL(apiBase).origin;
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

export const getWsUrl = (path: string): string => {
  const apiBase = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const url = new URL(apiBase);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}${cleanPath}`;
  }
  const loc = window.location;
  const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${loc.host}${cleanPath}`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

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
          const baseUrl = getBaseUrl();
          const { data } = await axios.post(`${baseUrl}/auth/refresh`, { refresh_token: refresh });
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
