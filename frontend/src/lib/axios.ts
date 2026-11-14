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
      // FormData must own the Content-Type so the browser can add the
      // multipart boundary. A forced application/json header breaks uploads.
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && 'Content-Type' in config.headers) {
          delete (config.headers as any)['Content-Type'];
        }
        delete (config.headers as any)['content-type'];
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

let refreshPromise: Promise<any> | null = null;

api.interceptors.response.use(
  (response) => {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    if (response.data) {
      response.data = resolveUploadPaths(response.data, baseUrl);
    }
    return response;
  },
  async (error) => {
    const isAuthMe = error.config?.url?.includes('/auth/me');
    const onCallback = typeof window !== 'undefined' && window.location.pathname === '/auth/callback';
    if (error.response?.status === 401 && !error.config._retry && error.config.url !== '/auth/login' && error.config.url !== '/auth/refresh-token' && !isAuthMe && !onCallback) {
      error.config._retry = true;
      try {
        const { useAuthStore } = await import('@/store/authStore');
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          // Do not logout during initial load or callback — just reject, App will handle
          return Promise.reject(error);
        }

        if (!refreshPromise) {
          const refreshUrl = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/auth/refresh-token`
            : '/api/v1/auth/refresh-token';
          refreshPromise = axios.post(refreshUrl, { refreshToken }, { withCredentials: true })
            .finally(() => { refreshPromise = null; });
        }

        const { data } = await refreshPromise;
        
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
      } catch (err: any) {
        // Only a definitive authentication failure should end the session.
        // Network errors, timeouts and provider outages must not log the
        // learner out in the middle of their work.
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          const { useAuthStore } = await import('@/store/authStore');
          await useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
