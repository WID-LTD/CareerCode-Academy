import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const baseApiUrl = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: baseApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

function resolveUploadPaths(obj: any, baseUrl: string): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/')) {
      return `${baseUrl}${obj}`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => resolveUploadPaths(item, baseUrl));
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = resolveUploadPaths(obj[key], baseUrl);
      }
    }
    return newObj;
  }
  return obj;
}

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const baseUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api/v1', '') 
      : 'http://localhost:5000';
    if (response.data) {
      response.data = resolveUploadPaths(response.data, baseUrl);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const refreshUrl = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/auth/refresh-token`
            : '/api/v1/auth/refresh-token';
          const { data } = await axios.post(refreshUrl, {
            refreshToken,
          });
          const newToken = data.data?.token || data.token;
          useAuthStore.getState().setToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export { api };
export default api;
