import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { apiRoutes, initializeServices } from './src/routes/api.js';

// Load environment variables
dotenv.config();

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Social Media Automation System',
    version: '1.0.0',
    description: 'Automated news-based social media posting with LLM-generated content',
    features: [
      'Scheduled news fetching every 6 hours',
      'LLM-powered content generation',
      'Image processing with text overlays',
      'Facebook and Instagram posting',
      'Duplicate detection and rate limiting',
      'REST API for manual operations'
    ],
    endpoints: {
      api: '/api',
      health: '/api/health',
      stats: '/api/stats',
      trigger: '/api/trigger (POST)',
      posts: '/api/posts'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    
    try {
      // Here you would close database connections, stop cron jobs, etc.
      console.log('🧹 Cleanup completed');
      process.exit(0);
    } catch (error) {
      console.error('💥 Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    console.error('⏰ Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, async () => {
  console.log('🚀 Social Media Automation System Starting...');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Cron schedule: ${process.env.CRON_SCHEDULE || '0 */6 * * *'}`);
  
  // Initialize services
  console.log('⚙️ Initializing services...');
  const initialized = await initializeServices();
  
  if (initialized) {
    console.log('✅ All services initialized successfully');
    console.log('🎯 System ready for automation');
    console.log(`📖 API documentation available at: http://localhost:${PORT}/api`);
    console.log(`💖 Health check available at: http://localhost:${PORT}/api/health`);
  } else {
    console.log('⚠️ Some services failed to initialize - check configuration');
  }
  
  console.log('='.repeat(60));
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;