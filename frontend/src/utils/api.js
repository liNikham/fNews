// API URL Configuration Utility
export const getApiUrl = () => {
  // Get base API URL from environment
  let apiUrl = import.meta.env.VITE_API_URL || '/api';
  
  // If VITE_API_URL is set (production), ensure it has /api prefix
  if (apiUrl && apiUrl !== '/api') {
    // Remove trailing slash if present
    apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    // Add /api if not already present
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`;
    }
  }
  
  return apiUrl;
};

// Helper to build full API endpoint URL
export const getApiEndpoint = (endpoint) => {
  const apiUrl = getApiUrl();
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${apiUrl}/${cleanEndpoint}`;
};

