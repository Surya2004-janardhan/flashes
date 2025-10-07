# News Slides Generator

Daily automation for producing share-ready news slides by combining real-time headlines from **Newsdata.io** with stylised overlays generated via the **API Template API**. Images are sourced from public domain repositories (Wikimedia Commons defaults, optional Pixabay) to keep licensing simple.

## Features

- 🔄 Fetches fresh world **and** India news across configurable categories.
- 🖼️ Pulls Creative Commons or public domain imagery from Wikimedia Commons (with optional Pixabay fallback).
- 🖌️ Calls API Template API to render professional slides with configurable templates.
- Saves slide PNGs plus a manifest JSON describing the source article metadata.

## Quick start

1. **Install dependencies**

   ```powershell
   npm install
   ```

2. **Configure environment**

   ```powershell
   copy .env.example .env
   ```

   Edit `.env` and provide at minimum:

   - `NEWSDATA_API_KEY`
   - `API_TEMPLATE_API_KEY`
   - `API_TEMPLATE_TEMPLATE_ID`

   Optional tweaks: categories, cron schedule, fonts, concurrency, etc.

3. **Generate slides on demand**

   ```powershell
   npm run generate
   ```

   Output lands under `output/<yyyy-mm-dd>/` with PNG slides and a `manifest.json` summary.

## News Slides Generator API

Microservices-style API for fetching real-time news, resolving images, and generating slides using Newsdata.io and Segmind APIs. Each service is exposed as a REST endpoint for on-demand use.

### Features

- 🔄 **GET /api/news**: Fetch latest world and India news across categories.
- 🖼️ **POST /api/image**: Resolve a suitable public domain image for an article.
- 🖌️ **POST /api/slide**: Generate a single eye-catching slide for an article.
- 📅 **POST /api/generate**: Orchestrate full slide generation and save to disk.
- 🏥 **GET /health**: Health check endpoint.
- 📰 **GET /api/news/politics**: Full pipeline for politics news (fetch, image, slide, publish).
- 🎥 **GET /api/news/cinema**: Full pipeline for cinema news.
- ⚽ **GET /api/news/sports**: Full pipeline for sports news.

### Quick start

1. **Install dependencies**

   ```powershell
   npm install
   ```

2. **Configure environment**

   ```powershell
   copy .env.example .env
   ```

   Add `NEWSDATA_API_KEY` and `SEGMIND_API_KEY`.

3. **Start the API server**

   ```powershell
   npm start
   ```

   Server runs on http://localhost:3000 by default.

4. **Use the endpoints**

   - Fetch news: `GET http://localhost:3000/api/news`
   - Generate slide for an article: `POST http://localhost:3000/api/slide` with JSON body `{ "article": {...} }`
   - Full generation: `POST http://localhost:3000/api/generate`

### API Reference

#### GET /api/news

Returns an array of latest articles.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "url": "string",
      "category": "string",
      "region": "string",
      "publishedAt": "date",
      "source": "string",
      "description": "string",
      "imageUrl": "string"
    }
  ]
}
```

#### POST /api/image

Resolves an image URL for the given article.

**Request Body:**

```json
{
  "article": {
    "title": "string",
    "category": "string",
    "region": "string",
    "source": "string"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "imageUrl": "string"
  }
}
```

#### POST /api/slide

Generates a slide PNG as base64 for the article.

**Request Body:** Same as /api/image.

**Response:**

```json
{
  "success": true,
  "data": {
    "filePath": "string",
    "mimeType": "image/png",
    "title": "string",
    "text": "string",
    "imageUrl": "string"
  }
}
```

#### POST /api/generate

Generates a full set of slides and saves to `output/<date>/`.

**Response:**

```json
{
  "success": true,
  "data": {
    "outputDir": "string",
    "manifestPath": "string",
    "slides": [
      {
        "article": {...},
        "summary": "string",
        "imageUrl": "string",
        "filePath": "string"
      }
    ]
  }
}
```

#### GET /api/news/politics

Fetches politics news, resolves images, generates slides, and publishes to socials.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "article": {
        "id": "string",
        "title": "string",
        "url": "string",
        "publishedAt": "date"
      },
      "imageUrl": "string",
      "text": "string",
      "slide": {
        "base64": "string",
        "mimeType": "image/png",
        "title": "string",
        "text": "string",
        "imageUrl": "string"
      },
      "publishResult": {
        "success": true,
        "postId": "string"
      }
    }
  ]
}
```

Similar for `/api/news/cinema` and `/api/news/sports`.

## Architecture overview

```
src/
├── server.js              // Express API server with endpoints
├── config.js              // Environment + defaults
├── logger.js              // Structured logging
├── run-once.js            // CLI entry for full generation
├── slideGenerator.js      // Orchestration logic
├── services/
│   ├── imageService.js    // Wikimedia / Pixabay image sourcing
│   ├── newsService.js     // Newsdata.io client
│   ├── segmindService.js  // Segmind Text Overlay client
│   └── socialService.js   // Social media publishing (placeholder)
└── utils/
    └── text.js            // Text processing helpers
```

## Testing

```powershell
npm test
```

Runs configuration tests.

## Notes & tips

- **Rate limits**: Newsdata free tier: 200/day, Segmind: 100/day. Use endpoints judiciously.
- **Image licensing**: Wikimedia images are public domain; check attributions in manifest.
- **Customization**: Adjust fonts/colors in `.env` for Segmind.
- **Deployment**: Run with PM2 or Docker for production.

Enjoy the modular API for news slide generation! ✨
