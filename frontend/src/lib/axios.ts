import axios from 'axios';

const baseApiUrl = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: baseApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refreshUrl = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/auth/refresh-token`
          : '/api/v1/auth/refresh-token';
        const { data } = await axios.post(refreshUrl, {}, { withCredentials: true });
        return api(error.config);
      } catch {
        const { useAuthStore } = await import('@/store/authStore');
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
