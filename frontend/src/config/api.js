// API Configuration
const getApiUrl = () => {
  // In production, use environment variable
  // In development, use relative path (Vite proxy handles it)
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (apiUrl) {
    // Remove trailing slash if present
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // Default to relative path for development
  return '/api';
};

export const API_URL = getApiUrl();

// Helper function to make API calls
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

