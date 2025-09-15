import express from 'express';
import AutomationService from '../services/AutomationService.js';
import Database from '../models/Database.js';

const router = express.Router();

// Initialize services
let automationService = null;
let database = null;

// Middleware to ensure services are initialized
const ensureServices = async (req, res, next) => {
  if (!automationService) {
    return res.status(503).json({
      error: 'Services not initialized',
      message: 'Please wait for the application to start up completely'
    });
  }
  next();
};

// Initialize services
const initializeServices = async () => {
  try {
    automationService = new AutomationService();
    database = new Database();
    
    await automationService.init();
    console.log('✅ API services initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize API services:', error.message);
    return false;
  }
};

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    if (!automationService) {
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Services not initialized'
      });
    }

    const health = await automationService.healthCheck();
    const isHealthy = health.database && health.newsService && health.socialMedia;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: health
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get automation statistics
router.get('/stats', ensureServices, (req, res) => {
  try {
    const stats = automationService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

// Manually trigger automation cycle
router.post('/trigger', ensureServices, async (req, res) => {
  try {
    if (automationService.isRunning) {
      return res.status(409).json({
        error: 'Automation already running',
        message: 'Please wait for the current cycle to complete'
      });
    }

    // Start the cycle asynchronously
    automationService.runManualCycle().catch(error => {
      console.error('Manual cycle error:', error.message);
    });

    res.json({
      message: 'Manual automation cycle triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger automation',
      message: error.message
    });
  }
});

// Get recent posts
router.get('/posts', ensureServices, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const posts = await database.getRecentPosts(hours);
    
    res.json({
      posts: posts,
      count: posts.length,
      hours: hours
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get posts',
      message: error.message
    });
  }
});

// Get specific post by ID
router.get('/posts/:id', ensureServices, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({
        error: 'Invalid post ID',
        message: 'Post ID must be a number'
      });
    }

    // This would need a getPostById method in Database class
    res.json({
      message: 'Post details endpoint',
      postId: postId,
      note: 'Implementation pending - would return specific post details'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get post',
      message: error.message
    });
  }
});

// Get social media account info
router.get('/accounts', ensureServices, async (req, res) => {
  try {
    const socialMediaService = automationService.socialMediaService;
    const accountInfo = await socialMediaService.getAccountInfo();
    
    res.json(accountInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get account info',
      message: error.message
    });
  }
});

// Test news API
router.get('/test/news', ensureServices, async (req, res) => {
  try {
    const type = req.query.type || 'global'; // 'global' or 'indian'
    const limit = parseInt(req.query.limit) || 5;
    
    const newsService = automationService.newsService;
    let news;
    
    if (type === 'indian') {
      news = await newsService.getIndianNews(limit);
    } else {
      news = await newsService.getGlobalNews(limit);
    }
    
    res.json({
      type: type,
      count: news.length,
      news: news
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test news API',
      message: error.message
    });
  }
});

// Test LLM content generation
router.post('/test/llm', ensureServices, async (req, res) => {
  try {
    const { title, description, source } = req.body;
    
    if (!title) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'Title is required'
      });
    }

    const mockNewsItem = {
      title: title,
      description: description || '',
      source: source || 'Test Source'
    };
    
    const llmService = automationService.llmService;
    const content = await llmService.generateSocialMediaContent(mockNewsItem);
    
    res.json({
      input: mockNewsItem,
      generated: content
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test LLM',
      message: error.message
    });
  }
});

// Configuration endpoint
router.get('/config', ensureServices, (req, res) => {
  try {
    const config = {
      cronSchedule: process.env.CRON_SCHEDULE || '0 */6 * * *',
      maxPostsPerDay: parseInt(process.env.MAX_POSTS_PER_DAY) || 10,
      minHoursBetweenPosts: parseInt(process.env.MIN_HOURS_BETWEEN_POSTS) || 6,
      nodeEnv: process.env.NODE_ENV,
      hasFacebookToken: !!process.env.FACEBOOK_ACCESS_TOKEN,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasNewsApiKey: !!process.env.NEWS_API_KEY
    };
    
    res.json(config);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error.message
    });
  }
});

// Logs endpoint (last 100 lines)
router.get('/logs', (req, res) => {
  try {
    // This is a simplified logs endpoint
    // In production, you'd want to implement proper log management
    res.json({
      message: 'Logs endpoint',
      note: 'Check console output for detailed logs',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get logs',
      message: error.message
    });
  }
});

// API documentation endpoint
router.get('/', (req, res) => {
  const endpoints = [
    {
      method: 'GET',
      path: '/api/health',
      description: 'Check system health status'
    },
    {
      method: 'GET',
      path: '/api/stats',
      description: 'Get automation statistics'
    },
    {
      method: 'POST',
      path: '/api/trigger',
      description: 'Manually trigger automation cycle'
    },
    {
      method: 'GET',
      path: '/api/posts',
      description: 'Get recent posts (query: hours=24)'
    },
    {
      method: 'GET',
      path: '/api/posts/:id',
      description: 'Get specific post by ID'
    },
    {
      method: 'GET',
      path: '/api/accounts',
      description: 'Get social media account information'
    },
    {
      method: 'GET',
      path: '/api/test/news',
      description: 'Test news API (query: type=global|indian, limit=5)'
    },
    {
      method: 'POST',
      path: '/api/test/llm',
      description: 'Test LLM content generation (body: {title, description?, source?})'
    },
    {
      method: 'GET',
      path: '/api/config',
      description: 'Get system configuration'
    },
    {
      method: 'GET',
      path: '/api/logs',
      description: 'Get application logs'
    }
  ];

  res.json({
    name: 'Social Media Automation API',
    version: '1.0.0',
    description: 'REST API for social media automation system',
    endpoints: endpoints
  });
});

export { router as apiRoutes, initializeServices };