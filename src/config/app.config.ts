// Application configuration
export const APP_CONFIG = {
  // Security
  PIN_LENGTH: 4,
  PIN_ATTEMPTS_LIMIT: 3,
  PIN_LOCKOUT_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Audio
  MAX_RECORDING_DURATION: 5 * 60 * 1000, // 5 minutes
  AUDIO_CHUNK_SIZE: 32768,
  
  // Database
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Notifications
  NOTIFICATION_CHANNEL_ID: 'task-reminders',
  MAX_PENDING_NOTIFICATIONS: 64,
  
  // Performance
  DEBOUNCE_DELAY: 300,
  SUBSCRIPTION_RECONNECT_DELAY: 5000,
} as const;

// Environment-specific configuration
export const getEnvironmentConfig = () => {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  
  return {
    isDevelopment,
    isProduction,
    apiUrl: import.meta.env.VITE_SUPABASE_URL,
    enableDebugLogs: isDevelopment,
    enableAnalytics: isProduction,
  };
};