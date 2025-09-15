export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*']
  },

  // Automation configuration
  automation: {
    cronSchedule: process.env.CRON_SCHEDULE || '0 */6 * * *',
    maxPostsPerDay: parseInt(process.env.MAX_POSTS_PER_DAY) || 10,
    minHoursBetweenPosts: parseInt(process.env.MIN_HOURS_BETWEEN_POSTS) || 6,
    maxRetries: 3,
    retryDelay: 60000 // 1 minute
  },

  // Database configuration
  database: {
    path: process.env.DATABASE_PATH || './data/posts.db'
  },

  // News API configuration
  newsApi: {
    apiKey: process.env.NEWS_API_KEY,
    indianApiKey: process.env.INDIAN_NEWS_API_KEY,
    baseUrl: 'https://newsapi.org/v2',
    defaultLimit: 10
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.7
  },

  // Social media configuration
  socialMedia: {
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
      apiVersion: 'v18.0'
    },
    instagram: {
      businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    }
  },

  // Image configuration
  image: {
    defaultUrl: process.env.DEFAULT_IMAGE_URL || 'https://via.placeholder.com/1080x1080/3498db/ffffff?text=News+Update',
    outputFormat: 'jpeg',
    quality: 95,
    dimensions: {
      width: 1080,
      height: 1080
    }
  },

  // Paths
  paths: {
    tempDir: './assets/temp',
    outputDir: './assets/images',
    logDir: './logs',
    dataDir: './data'
  }
};

// Validation function
export const validateConfig = () => {
  const errors = [];
  const warnings = [];

  // Check required environment variables for production
  if (config.server.nodeEnv === 'production') {
    if (!config.socialMedia.facebook.accessToken) {
      errors.push('FACEBOOK_ACCESS_TOKEN is required for production');
    }
    if (!config.socialMedia.instagram.businessAccountId) {
      errors.push('INSTAGRAM_BUSINESS_ACCOUNT_ID is required for production');
    }
  }

  // Check optional but recommended configurations
  if (!config.openai.apiKey) {
    warnings.push('OPENAI_API_KEY not set - using fallback content generation');
  }
  if (!config.newsApi.apiKey) {
    warnings.push('NEWS_API_KEY not set - using mock news data');
  }

  // Validate cron schedule format (basic check)
  const cronParts = config.automation.cronSchedule.split(' ');
  if (cronParts.length !== 5) {
    errors.push('Invalid CRON_SCHEDULE format - should have 5 parts');
  }

  // Validate numeric configurations
  if (config.automation.maxPostsPerDay < 1) {
    errors.push('MAX_POSTS_PER_DAY must be at least 1');
  }
  if (config.automation.minHoursBetweenPosts < 1) {
    errors.push('MIN_HOURS_BETWEEN_POSTS must be at least 1');
  }

  return { errors, warnings };
};

// Helper function to get configuration summary
export const getConfigSummary = () => {
  return {
    environment: config.server.nodeEnv,
    port: config.server.port,
    cronSchedule: config.automation.cronSchedule,
    maxPostsPerDay: config.automation.maxPostsPerDay,
    hasOpenAI: !!config.openai.apiKey,
    hasNewsApi: !!config.newsApi.apiKey,
    hasFacebookToken: !!config.socialMedia.facebook.accessToken,
    hasInstagramConfig: !!config.socialMedia.instagram.businessAccountId
  };
};

export default config;