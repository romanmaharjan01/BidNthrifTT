// Configuration for the application

// Helper function to safely get environment variables
const getEnv = (key: string, defaultValue: string): string => {
  // For Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[`VITE_${key}`];
    if (value) return value;
  }
  
  // Fallback for window.env if configured
  if (typeof window !== 'undefined' && window.env && window.env[key]) {
    return window.env[key];
  }
  
  return defaultValue;
};

// Declare global window interface for TypeScript
declare global {
  interface Window {
    env?: Record<string, string>;
  }
}

const config = {
  // API URLs
  apiUrl: getEnv('API_URL', 'http://localhost:5002'),
  
  // Stripe configuration
  stripe: {
    publishableKey: getEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_51RGXzVPewya4IHYyhSnVWU000x3SxIRlCMbtywY8rYsBXrxv81SpXDEvlq1kIVx5QZiJYfa9ocHMvtYBLsP883wv00ovh93c0C'),
  },
  
  // Currency configuration
  currency: {
    code: 'NPR',
    symbol: 'Rs.',
    // Approximate conversion rate for display purposes
    nprToInrRate: 0.625,
  },
};

export default config; 