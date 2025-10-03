# News Slides Generator

Daily automation for producing share-ready news slides by combining real-time headlines from **Newsdata.io** with stylised overlays generated via the **Segmind Text Overlay API**. Images are sourced from public domain repositories (Wikimedia Commons defaults, optional Pixabay) to keep licensing simple.

## Features

- 🔄 Fetches fresh world **and** India news across configurable categories.
- 🖼️ Pulls Creative Commons or public domain imagery from Wikimedia Commons (with optional Pixabay fallback).
- 🖌️ Calls Segmind's Text Overlay API to render professional slides with configurable typography and layout.
- 📅 Automates daily generation of 10+ slides, with a scheduler ready out-of-the-box.
- 📂 Saves slide PNGs plus a manifest JSON describing the source article metadata.

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
   - `SEGMIND_API_KEY`

   Optional tweaks: categories, cron schedule, fonts, concurrency, etc.

3. **Generate slides on demand**

   ```powershell
   npm run generate
   ```

   Output lands under `output/<yyyy-mm-dd>/` with PNG slides and a `manifest.json` summary.

4. **Run the daily scheduler**

   ```powershell
   npm run schedule
   ```

   The default cron expression runs at 06:00 UTC. Adjust `SCHEDULE_CRON` and `SCHEDULE_TIMEZONE` in `.env` to match your locale.

## Architecture overview

```
src/
├── config.js            // Loads environment + defaults
├── logger.js            // Minimal structured logging helper
├── run-once.js          // Entry point for a single generation run
├── scheduler.js         // Cron-based daily automation
├── slideGenerator.js    // Core orchestration pipeline
├── services/
│   ├── imageService.js  // Wikimedia / Pixabay image sourcing
│   ├── newsService.js   // Newsdata.io client with dedupe + sorting
│   └── segmindService.js// Segmind Text Overlay client
└── utils/
    └── text.js          // Copy cleanup helpers
```

### Workflow

1. `newsService` fetches the latest stories for India and select global markets across the configured categories.
2. `imageService` attaches a relevant, license-friendly image.
3. `segmindService` posts headline + summary + background to Segmind, returning a polished slide.
4. `slideGenerator` persists PNGs and writes a manifest for downstream sharing pipelines.

## Testing

```powershell
npm test
```

Currently this runs lightweight configuration tests using Node's native test runner. Extend the suite with additional service-level mocks as you integrate.

## Notes & tips

- **Rate limits**: The default setup keeps Newsdata and Segmind within free tier limits (≤ 100 daily calls each) by batching per category and capping the total slides.
- **Image licensing**: Wikimedia images returned by the API may require attribution. The manifest includes source URLs to simplify compliance.
- **Segmind template tweaks**: Adjust fonts, colours, and layout by overriding the `SEGMIND_*` variables in `.env`.
- **Scheduling**: Deploy the scheduler behind a process manager (PM2, Docker, systemd) for production use.

Enjoy fast-tracking your daily news flashes! ✨
