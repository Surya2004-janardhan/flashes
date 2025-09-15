import axios from 'axios';

class NewsService {
  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.baseUrl = 'https://newsapi.org/v2';
    
    // Alternative free news APIs as fallbacks
    this.fallbackApis = [
      {
        name: 'newsdata.io',
        url: 'https://newsdata.io/api/1/news',
        key: process.env.NEWSDATA_API_KEY
      }
    ];
  }

  async getGlobalNews(limit = 10) {
    try {
      // Try primary NewsAPI first
      if (this.newsApiKey) {
        const response = await axios.get(`${this.baseUrl}/top-headlines`, {
          params: {
            apiKey: this.newsApiKey,
            language: 'en',
            pageSize: limit,
            category: 'general'
          }
        });

        if (response.data.articles) {
          return this.formatNews(response.data.articles);
        }
      }

      // Fallback to free APIs
      return await this.getFallbackNews('global', limit);
    } catch (error) {
      console.error('Error fetching global news:', error.message);
      return await this.getFallbackNews('global', limit);
    }
  }

  async getIndianNews(limit = 10) {
    try {
      if (this.newsApiKey) {
        const response = await axios.get(`${this.baseUrl}/top-headlines`, {
          params: {
            apiKey: this.newsApiKey,
            country: 'in',
            language: 'en',
            pageSize: limit
          }
        });

        if (response.data.articles) {
          return this.formatNews(response.data.articles);
        }
      }

      return await this.getFallbackNews('india', limit);
    } catch (error) {
      console.error('Error fetching Indian news:', error.message);
      return await this.getFallbackNews('india', limit);
    }
  }

  async getFallbackNews(region = 'global', limit = 10) {
    // Use RSS feeds as a free alternative
    try {
      // For demo purposes, return mock news data
      return this.getMockNews(region, limit);
    } catch (error) {
      console.error('Error fetching fallback news:', error.message);
      return this.getMockNews(region, limit);
    }
  }

  getMockNews(region = 'global', limit = 10) {
    const mockNewsGlobal = [
      {
        title: "Global Climate Summit Reaches Historic Agreement",
        description: "World leaders unite on ambitious climate targets for 2030",
        url: "https://example.com/climate-summit-2024",
        imageUrl: "https://via.placeholder.com/800x600/2ecc71/ffffff?text=Climate+Summit",
        publishedAt: new Date().toISOString(),
        source: "Global News Network"
      },
      {
        title: "Breakthrough in Renewable Energy Technology",
        description: "Scientists develop new solar panel technology with 45% efficiency",
        url: "https://example.com/solar-breakthrough",
        imageUrl: "https://via.placeholder.com/800x600/3498db/ffffff?text=Solar+Tech",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        source: "Tech Today"
      },
      {
        title: "International Space Station Gets Major Upgrade",
        description: "New modules expand research capabilities for future missions",
        url: "https://example.com/iss-upgrade",
        imageUrl: "https://via.placeholder.com/800x600/9b59b6/ffffff?text=Space+Station",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        source: "Space News"
      }
    ];

    const mockNewsIndia = [
      {
        title: "India Launches Digital Infrastructure Revolution",
        description: "Government announces nationwide 5G rollout completion",
        url: "https://example.com/india-5g-rollout",
        imageUrl: "https://via.placeholder.com/800x600/e74c3c/ffffff?text=5G+India",
        publishedAt: new Date().toISOString(),
        source: "India Today"
      },
      {
        title: "Historic Archaeological Discovery in Rajasthan",
        description: "Ancient civilization artifacts found dating back 4000 years",
        url: "https://example.com/rajasthan-discovery",
        imageUrl: "https://via.placeholder.com/800x600/f39c12/ffffff?text=Archaeological+Find",
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        source: "Archaeological Survey"
      },
      {
        title: "Indian Startups Reach Record Funding Milestone",
        description: "Tech ecosystem attracts $50 billion in investments this year",
        url: "https://example.com/startup-funding-record",
        imageUrl: "https://via.placeholder.com/800x600/1abc9c/ffffff?text=Startup+Funding",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        source: "Business Herald"
      }
    ];

    const newsData = region === 'india' ? mockNewsIndia : mockNewsGlobal;
    return newsData.slice(0, limit);
  }

  formatNews(articles) {
    return articles.map(article => ({
      title: article.title,
      description: article.description || '',
      url: article.url,
      imageUrl: article.urlToImage || process.env.DEFAULT_IMAGE_URL,
      publishedAt: article.publishedAt,
      source: article.source?.name || 'Unknown Source'
    }));
  }

  async getRandomNews() {
    try {
      const [globalNews, indianNews] = await Promise.all([
        this.getGlobalNews(5),
        this.getIndianNews(5)
      ]);

      const allNews = [...globalNews, ...indianNews];
      const randomIndex = Math.floor(Math.random() * allNews.length);
      return allNews[randomIndex];
    } catch (error) {
      console.error('Error getting random news:', error.message);
      // Return fallback news item
      return this.getMockNews('global', 1)[0];
    }
  }
}

export default NewsService;