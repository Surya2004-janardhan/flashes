import cron from 'node-cron';
import crypto from 'crypto';
import NewsService from './NewsService.js';
import LLMService from './LLMService.js';
import ImageService from './ImageService.js';
import SocialMediaService from './SocialMediaService.js';
import Database from '../models/Database.js';

class AutomationService {
  constructor() {
    this.newsService = new NewsService();
    this.llmService = new LLMService();
    this.imageService = new ImageService();
    this.socialMediaService = new SocialMediaService();
    this.database = new Database();
    
    this.isRunning = false;
    this.lastRunTime = null;
    this.stats = {
      totalRuns: 0,
      successfulPosts: 0,
      failedPosts: 0,
      duplicatesSkipped: 0
    };

    // Configuration
    this.cronSchedule = process.env.CRON_SCHEDULE || '0 */6 * * *'; // Every 6 hours
    this.maxRetries = 3;
    this.retryDelay = 60000; // 1 minute
    this.maxPostsPerDay = parseInt(process.env.MAX_POSTS_PER_DAY) || 10;
  }

  async init() {
    try {
      await this.database.init();
      console.log('✅ Database initialized successfully');
      
      // Start the cron job
      this.startScheduler();
      console.log(`📅 Scheduler started with pattern: ${this.cronSchedule}`);
      
      // Run initial health check
      await this.healthCheck();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize automation service:', error.message);
      return false;
    }
  }

  startScheduler() {
    // Schedule the main automation job
    cron.schedule(this.cronSchedule, async () => {
      console.log(`🚀 Scheduled job triggered at ${new Date().toISOString()}`);
      await this.runAutomationCycle();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    // Schedule daily cleanup job
    cron.schedule('0 0 * * *', async () => {
      console.log('🧹 Running daily cleanup...');
      this.imageService.cleanup();
      await this.cleanupOldData();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    console.log('📅 Cron jobs scheduled successfully');
  }

  async runAutomationCycle() {
    if (this.isRunning) {
      console.log('⏳ Automation cycle already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();
    this.stats.totalRuns++;

    try {
      console.log('🔄 Starting automation cycle...');

      // Check daily post limit
      const todaysPosts = await this.getTodayPostCount();
      if (todaysPosts >= this.maxPostsPerDay) {
        console.log('📊 Daily post limit reached, skipping cycle');
        return;
      }

      // Get fresh news
      const newsItem = await this.getUniqueNewsItem();
      if (!newsItem) {
        console.log('📰 No new unique news items found');
        return;
      }

      // Generate content and create post
      const result = await this.createAndPublishPost(newsItem);
      
      if (result.success) {
        console.log('✅ Automation cycle completed successfully');
        this.stats.successfulPosts++;
      } else {
        console.log('❌ Automation cycle failed');
        this.stats.failedPosts++;
      }

    } catch (error) {
      console.error('💥 Error in automation cycle:', error.message);
      this.stats.failedPosts++;
    } finally {
      this.isRunning = false;
    }
  }

  async getUniqueNewsItem() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const newsItem = await this.newsService.getRandomNews();
        
        // Check if news URL was already processed
        const alreadyProcessed = await this.database.isNewsProcessed(newsItem.url);
        
        if (!alreadyProcessed) {
          return newsItem;
        }

        attempts++;
        console.log(`📄 News item already processed, trying again... (${attempts}/${maxAttempts})`);
      } catch (error) {
        console.error('Error getting news item:', error.message);
        attempts++;
      }
    }

    console.log('⚠️ Could not find unique news item after maximum attempts');
    return null;
  }

  async createAndPublishPost(newsItem) {
    let postId = null;
    
    try {
      // Generate content using LLM
      console.log('🤖 Generating content with LLM...');
      const content = await this.llmService.generateSocialMediaContent(newsItem);
      
      // Generate content hash for duplicate detection
      const contentHash = this.generateContentHash(content.shortCaption + content.longDescription);
      
      // Check for duplicate content
      const isDuplicate = await this.database.isContentDuplicate(contentHash);
      if (isDuplicate) {
        console.log('📋 Duplicate content detected, skipping...');
        this.stats.duplicatesSkipped++;
        return { success: false, reason: 'duplicate_content' };
      }

      // Generate image text overlay data
      const imageTextData = await this.llmService.generateImageText(newsItem);
      
      // Create image with text overlay
      console.log('🖼️ Creating image with text overlay...');
      const imagePath = await this.imageService.createPostImage(newsItem, imageTextData);
      
      // Save post metadata to database
      postId = await this.database.insertPost({
        title: newsItem.title,
        content: content.longDescription,
        hashtags: content.hashtags.join(' '),
        imagePath: imagePath,
        newsUrl: newsItem.url,
        platform: 'both',
        contentHash: contentHash
      });

      // Publish to social media platforms
      console.log('📱 Publishing to social media platforms...');
      const publishResults = await this.publishWithRetry(content, imagePath);
      
      // Update post status based on results
      const allSuccessful = publishResults.every(result => result.success);
      const status = allSuccessful ? 'published' : 'partial_failure';
      const errorMessages = publishResults
        .filter(result => !result.success)
        .map(result => `${result.platform}: ${result.error}`)
        .join('; ');

      await this.database.updatePostStatus(postId, status, errorMessages || null);
      
      // Mark news as processed
      await this.database.markNewsAsProcessed(newsItem.url, newsItem.title);
      
      console.log(`📊 Post ${postId} status: ${status}`);
      
      return {
        success: allSuccessful,
        postId: postId,
        results: publishResults,
        status: status
      };

    } catch (error) {
      console.error('Error creating and publishing post:', error.message);
      
      if (postId) {
        await this.database.updatePostStatus(postId, 'failed', error.message);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async publishWithRetry(content, imagePath) {
    let attempt = 0;
    let results = [];

    while (attempt < this.maxRetries) {
      try {
        // Use mock posting for demo/testing
        if (process.env.NODE_ENV === 'development' || !process.env.FACEBOOK_ACCESS_TOKEN) {
          results = await this.socialMediaService.mockPost(content, imagePath);
        } else {
          results = await this.socialMediaService.postToAllPlatforms(content, imagePath);
        }

        // Check if any posts failed
        const failures = results.filter(result => !result.success);
        
        if (failures.length === 0) {
          console.log('✅ All platforms posted successfully');
          break;
        } else if (attempt < this.maxRetries - 1) {
          console.log(`⚠️ Some platforms failed, retrying in ${this.retryDelay / 1000} seconds... (attempt ${attempt + 1}/${this.maxRetries})`);
          await this.delay(this.retryDelay);
          attempt++;
        } else {
          console.log('❌ Maximum retry attempts reached');
          break;
        }

      } catch (error) {
        console.error(`💥 Publish attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay);
          attempt++;
        } else {
          results = [
            { success: false, platform: 'facebook', error: error.message },
            { success: false, platform: 'instagram', error: error.message }
          ];
          break;
        }
      }
    }

    return results;
  }

  async getTodayPostCount() {
    const posts = await this.database.getRecentPosts(24);
    return posts.length;
  }

  generateContentHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async cleanupOldData() {
    // This would clean up old posts, images, etc.
    // For now, just log the action
    console.log('🧹 Performing data cleanup...');
  }

  async healthCheck() {
    console.log('🔍 Running health check...');
    
    const health = {
      database: false,
      newsService: false,
      socialMedia: false,
      errors: []
    };

    // Check database
    try {
      await this.database.getRecentPosts(1);
      health.database = true;
    } catch (error) {
      health.errors.push(`Database: ${error.message}`);
    }

    // Check news service
    try {
      await this.newsService.getMockNews('global', 1);
      health.newsService = true;
    } catch (error) {
      health.errors.push(`News Service: ${error.message}`);
    }

    // Check social media tokens (if configured)
    if (process.env.FACEBOOK_ACCESS_TOKEN) {
      try {
        const validation = await this.socialMediaService.validateTokens();
        health.socialMedia = validation.facebook && validation.instagram;
        if (!health.socialMedia) {
          health.errors.push(...validation.errors);
        }
      } catch (error) {
        health.errors.push(`Social Media: ${error.message}`);
      }
    } else {
      health.socialMedia = true; // Skip validation if not configured
    }

    const isHealthy = health.database && health.newsService && health.socialMedia;
    console.log(`💖 Health check ${isHealthy ? 'PASSED' : 'FAILED'}`);
    
    if (health.errors.length > 0) {
      console.log('⚠️ Health check errors:', health.errors);
    }

    return health;
  }

  // Manual trigger for testing
  async runManualCycle() {
    console.log('🔄 Running manual automation cycle...');
    return await this.runAutomationCycle();
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      cronSchedule: this.cronSchedule
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    console.log('🛑 Shutting down automation service...');
    this.isRunning = false;
    
    if (this.database) {
      await this.database.close();
    }
    
    console.log('✅ Automation service shut down complete');
  }
}

export default AutomationService;