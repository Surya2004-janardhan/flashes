// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.CRON_SCHEDULE = '0 */6 * * *';
process.env.MAX_POSTS_PER_DAY = '5';

describe('News Service', () => {
  let NewsService;
  let newsService;

  beforeAll(async () => {
    const module = await import('../src/services/NewsService.js');
    NewsService = module.default;
    newsService = new NewsService();
  });

  test('should get mock global news', async () => {
    const news = await newsService.getGlobalNews(3);
    
    expect(news).toBeDefined();
    expect(Array.isArray(news)).toBe(true);
    expect(news.length).toBeLessThanOrEqual(3);
    
    if (news.length > 0) {
      expect(news[0]).toHaveProperty('title');
      expect(news[0]).toHaveProperty('description');
      expect(news[0]).toHaveProperty('url');
    }
  });

  test('should get mock Indian news', async () => {
    const news = await newsService.getIndianNews(3);
    
    expect(news).toBeDefined();
    expect(Array.isArray(news)).toBe(true);
    expect(news.length).toBeLessThanOrEqual(3);
  });

  test('should get random news item', async () => {
    const newsItem = await newsService.getRandomNews();
    
    expect(newsItem).toBeDefined();
    expect(newsItem).toHaveProperty('title');
    expect(newsItem).toHaveProperty('url');
  });

  test('should format news articles correctly', () => {
    const mockArticles = [
      {
        title: 'Test News',
        description: 'Test Description',
        url: 'https://example.com',
        urlToImage: 'https://example.com/image.jpg',
        publishedAt: '2024-01-01T00:00:00Z',
        source: { name: 'Test Source' }
      }
    ];

    const formatted = newsService.formatNews(mockArticles);
    
    expect(formatted).toBeDefined();
    expect(formatted.length).toBe(1);
    expect(formatted[0]).toHaveProperty('title', 'Test News');
    expect(formatted[0]).toHaveProperty('imageUrl', 'https://example.com/image.jpg');
  });
});

describe('LLM Service', () => {
  let LLMService;
  let llmService;

  beforeAll(async () => {
    const module = await import('../src/services/LLMService.js');
    LLMService = module.default;
    llmService = new LLMService();
  });

  test('should generate fallback content without OpenAI API', async () => {
    const mockNewsItem = {
      title: 'Test News Article',
      description: 'This is a test news article description',
      source: 'Test Source'
    };

    const content = await llmService.generateSocialMediaContent(mockNewsItem);
    
    expect(content).toBeDefined();
    expect(content).toHaveProperty('shortCaption');
    expect(content).toHaveProperty('longDescription');
    expect(content).toHaveProperty('hashtags');
    expect(Array.isArray(content.hashtags)).toBe(true);
  });

  test('should generate hashtags from text', () => {
    const mockNewsItem = {
      title: 'Breaking Climate Change Summit Results',
      description: 'World leaders agree on new environmental policies',
      source: 'News Source'
    };

    const hashtags = llmService.generateHashtags(mockNewsItem);
    
    expect(Array.isArray(hashtags)).toBe(true);
    expect(hashtags.length).toBeGreaterThan(0);
    expect(hashtags.some(tag => tag.startsWith('#'))).toBe(true);
  });

  test('should truncate text properly', () => {
    const longText = 'This is a very long text that should be truncated at some point to fit within the specified character limit for social media posts';
    const truncated = llmService.truncateText(longText, 50);
    
    expect(truncated.length).toBeLessThanOrEqual(50);
    expect(truncated.endsWith('...')).toBe(true);
  });

  test('should extract keywords from text', () => {
    const text = 'Climate change summit brings world leaders together for environmental discussions';
    const keywords = llmService.extractKeywords(text);
    
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.includes('climate')).toBe(true);
  });
});

describe('Database', () => {
  let Database;
  let database;

  beforeAll(async () => {
    const module = await import('../src/models/Database.js');
    Database = module.default;
    database = new Database();
    await database.init();
  });

  afterAll(async () => {
    await database.close();
  });

  test('should initialize database', async () => {
    expect(database.db).toBeDefined();
  });

  test('should insert and retrieve posts', async () => {
    const postData = {
      title: 'Test Post',
      content: 'Test content',
      hashtags: '#test #automation',
      imagePath: '/path/to/image.jpg',
      newsUrl: 'https://example.com/news',
      platform: 'facebook',
      contentHash: 'testhash123'
    };

    const postId = await database.insertPost(postData);
    expect(postId).toBeDefined();
    expect(typeof postId).toBe('number');
  });

  test('should detect duplicate content', async () => {
    const contentHash = 'duplicate-test-hash';
    
    // First insertion
    const postData = {
      title: 'Duplicate Test',
      content: 'Test content',
      hashtags: '#test',
      imagePath: '/path/to/image.jpg',
      newsUrl: 'https://example.com/duplicate',
      platform: 'facebook',
      contentHash: contentHash
    };

    await database.insertPost(postData);
    
    // Check for duplicate
    const isDuplicate = await database.isContentDuplicate(contentHash);
    expect(isDuplicate).toBe(true);
  });

  test('should mark news as processed', async () => {
    const newsUrl = 'https://example.com/processed-news';
    const title = 'Processed News Title';

    await database.markNewsAsProcessed(newsUrl, title);
    
    const isProcessed = await database.isNewsProcessed(newsUrl);
    expect(isProcessed).toBe(true);
  });
});

describe('Configuration', () => {
  let config, validateConfig;

  beforeAll(async () => {
    const module = await import('../src/config/index.js');
    config = module.config;
    validateConfig = module.validateConfig;
  });

  test('should have default configuration values', () => {
    expect(config.server.port).toBe(3000);
    expect(config.automation.cronSchedule).toBe('0 */6 * * *');
    expect(config.automation.maxPostsPerDay).toBe(5); // Set in test env
  });

  test('should validate configuration', () => {
    const validation = validateConfig();
    
    expect(validation).toHaveProperty('errors');
    expect(validation).toHaveProperty('warnings');
    expect(Array.isArray(validation.errors)).toBe(true);
    expect(Array.isArray(validation.warnings)).toBe(true);
  });
});