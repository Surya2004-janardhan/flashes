# Social Media Automation System

Automated news-based social media posting system with LLM-generated content, scheduled posting to Instagram and Facebook.

## Features

- **🕐 Scheduled Automation**: Posts every 6 hours using node-cron
- **📰 News Integration**: Fetches global and Indian news via APIs
- **🤖 AI Content Generation**: Uses LLM (OpenAI) to generate captions and hashtags
- **🖼️ Image Processing**: Creates compelling visuals with text overlays using Sharp
- **📱 Multi-Platform Posting**: Posts to Instagram Business and Facebook via Graph API
- **🔍 Duplicate Detection**: Prevents duplicate content using content hashing
- **⚡ Rate Limiting**: Respects platform limits with built-in delays
- **🔄 Error Handling**: Automatic retries with exponential backoff
- **📊 REST API**: Manual trigger and monitoring endpoints
- **🏗️ Database Storage**: SQLite for post metadata and analytics

## Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd Socials_ai_automation
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your API keys and tokens
```

### 3. Run the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 4. Access the API
- API Documentation: `http://localhost:3000/api`
- Health Check: `http://localhost:3000/api/health`
- Manual Trigger: `POST http://localhost:3000/api/trigger`

## Environment Variables

### Required for Production
```env
# Facebook/Instagram API
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_ACCESS_TOKEN=your_facebook_page_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
```

### Optional (Recommended)
```env
# OpenAI for content generation
OPENAI_API_KEY=your_openai_api_key

# News APIs
NEWS_API_KEY=your_newsapi_org_key
INDIAN_NEWS_API_KEY=your_indian_news_api_key

# Customization
CRON_SCHEDULE=0 */6 * * *
MAX_POSTS_PER_DAY=10
MIN_HOURS_BETWEEN_POSTS=6
```

## API Endpoints

### Core Operations
- `GET /api/health` - System health check
- `GET /api/stats` - Automation statistics
- `POST /api/trigger` - Manually trigger posting cycle
- `GET /api/posts` - View recent posts
- `GET /api/config` - View system configuration

### Testing
- `GET /api/test/news` - Test news fetching
- `POST /api/test/llm` - Test content generation

## Architecture

```
├── src/
│   ├── services/
│   │   ├── NewsService.js      # News API integration
│   │   ├── LLMService.js       # AI content generation
│   │   ├── ImageService.js     # Image processing with Sharp
│   │   ├── SocialMediaService.js # Facebook/Instagram posting
│   │   └── AutomationService.js  # Main orchestrator
│   ├── models/
│   │   └── Database.js         # SQLite database operations
│   ├── routes/
│   │   └── api.js             # REST API endpoints
│   ├── config/
│   │   └── index.js           # Configuration management
│   └── utils/
│       └── logger.js          # Logging utility
├── assets/
│   ├── images/                # Generated post images
│   └── temp/                  # Temporary files
└── tests/                     # Test suites
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Manual Testing
```bash
# Test news fetching
curl http://localhost:3000/api/test/news

# Test content generation
curl -X POST http://localhost:3000/api/test/llm \
  -H "Content-Type: application/json" \
  -d '{"title": "Test News Title"}'

# Trigger manual posting
curl -X POST http://localhost:3000/api/trigger
```

## Deployment

Ready for deployment on free platforms like Railway, Render, or Heroku with secure environment variable configuration.

## License

ISC License
