// ============================================================================
// Application Constants
// ============================================================================

export const CONSTANTS = {
  DEFAULT_PORT: 5000,
  DEFAULT_CLIENT_URL: 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
};
