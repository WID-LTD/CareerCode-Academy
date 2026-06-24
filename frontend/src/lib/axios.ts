import axios from 'axios';

const baseApiUrl = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: baseApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const { useAuthStore } = await import('@/store/authStore');
      const token = useAuthStore.getState().token;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Store might not be ready
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    if (response.data) {
      response.data = resolveUploadPaths(response.data, baseUrl);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry && error.config.url !== '/auth/login' && error.config.url !== '/auth/refresh-token') {
      error.config._retry = true;
      try {
        const { useAuthStore } = await import('@/store/authStore');
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        const refreshUrl = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/auth/refresh-token`
          : '/api/v1/auth/refresh-token';
          
        const { data } = await axios.post(refreshUrl, { refreshToken }, { withCredentials: true });
        
        if (data && data.success && data.data) {
          useAuthStore.setState({
            token: data.data.token,
            refreshToken: data.data.refreshToken
          });
          
          error.config.headers.Authorization = `Bearer ${data.data.token}`;
          return api(error.config);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (err) {
        const { useAuthStore } = await import('@/store/authStore');
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
