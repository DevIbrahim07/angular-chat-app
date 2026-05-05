const LOCAL_BACKEND_URL = 'http://localhost:3000';
const PRODUCTION_BACKEND_URL = 'https://chatapp-backend-production-76de.up.railway.app';

const getBrowserHostname = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.hostname;
};

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1';

export const API_BASE_URL = isLocalHost(getBrowserHostname())
  ? LOCAL_BACKEND_URL
  : PRODUCTION_BACKEND_URL;

export const SOCKET_BASE_URL = API_BASE_URL;

export const resolveBackendUrl = (value: string): string => {
  if (!value || value.startsWith('http') || value.startsWith('blob:')) {
    return value;
  }

  return `${API_BASE_URL}${value}`;
};
