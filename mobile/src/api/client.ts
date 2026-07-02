import axios, { AxiosResponse, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { ApiResponse } from '../types/api.types';
import { useAuthStore } from '../store/useAuthStore';
import * as RootNavigation from '../utils/RootNavigation';

// Change this when your laptop's IP changes
const LOCAL_IP = '192.168.0.103';

const BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? `http://${LOCAL_IP}:5000/api`
    : 'http://localhost:5000/api'
  : 'https://your-production-api.com/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Request Interceptor: Inject JWT token into Bearer Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Automatically flattens and intercepts the data payload contract
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // If the server returns our structural contract, pass the ApiResponse object downstream
    return response.data;
  },
  (error: AxiosError) => {
    let structuredError: ApiResponse = {
      success: false,
      message: 'A network communication timeout occurred.',
      error: { code: 'NETWORK_ERROR' }
    };

    if (error.response && error.response.data) {
      // Server responded with an explicit contract payload
      const serverPayload = error.response.data as ApiResponse;
      structuredError = {
        success: false,
        message: serverPayload.message || 'An unexpected operation error occurred.',
        error: serverPayload.error || { code: 'UNKNOWN_ERROR' }
      };

      // If the session token is expired or invalid, auto-logout and reset stack to gateway login
      if (structuredError.error?.code === 'INVALID_TOKEN') {
        useAuthStore.getState().logout();
        RootNavigation.reset([{ name: 'AuthScreen' }]);
      }
    } else if (error.request) {
      // Request sent but zero packets returned
      structuredError.message = 'The server is unreachable. Check your wireless connection status.';
      structuredError.error = { code: 'SERVER_UNREACHABLE' };
    }

    // Always reject with the clean contractual layout
    return Promise.reject(structuredError);
  }
);

export default apiClient;