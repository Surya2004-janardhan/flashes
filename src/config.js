const path = require("node:path");
const dotenv = require("dotenv");

const envResult = dotenv.config();
if (envResult.error && envResult.error.code !== "ENOENT") {
  console.warn("[config] Unable to load .env file:", envResult.error.message);
}

const DEFAULT_CATEGORIES = [
  "top",
  "world",
  "business",
  "technology",
  "science",
  "health",
  "entertainment",
];

const DEFAULT_WORLD_COUNTRIES = ["us", "gb", "ca"];

function parseList(value, fallback) {
  if (!value) return [...fallback];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function numeric(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bool(value, fallback) {
  if (typeof value === "undefined") return fallback;
  return ["true", "1", "yes", "y", "on"].includes(String(value).toLowerCase());
}

function loadConfig(options = {}) {
  const env = { ...process.env, ...(options.env || {}) };

  const outputBaseDir =
    options.outputBaseDir || path.resolve(__dirname, "..", "output");

  const newsCategories = parseList(env.NEWS_CATEGORIES, DEFAULT_CATEGORIES);
  const worldCountries = parseList(
    env.WORLD_COUNTRIES,
    DEFAULT_WORLD_COUNTRIES
  );

  return {
    newsdata: {
      apiKey: env.NEWSDATA_API_KEY || "",
      baseUrl: env.NEWSDATA_BASE_URL || "https://newsdata.io/api/1/news",
      categories: newsCategories,
      indiaCountryCode: env.INDIA_COUNTRY_CODE || "in",
      worldCountries,
      languages: parseList(env.NEWS_LANGUAGES, ["en"]),
      maxArticlesPerCategory: numeric(env.MAX_ARTICLES_PER_CATEGORY, 6),
      requestTimeoutMs: numeric(env.NEWSDATA_TIMEOUT_MS, 10000),
    },
    slides: {
      targetCount: numeric(env.SLIDES_TARGET_COUNT, 12),
      summaryMaxLength: numeric(env.SUMMARY_MAX_LENGTH, 280),
      outputDir: outputBaseDir,
      filenamePrefix: env.SLIDE_FILENAME_PREFIX || "news-slide",
      manifestName: env.SLIDE_MANIFEST_NAME || "manifest.json",
      concurrentJobs: numeric(env.SLIDE_CONCURRENCY, 3),
    },
    images: {
      wikimedia: {
        baseUrl:
          env.WIKIMEDIA_BASE_URL || "https://commons.wikimedia.org/w/api.php",
        license: env.WIKIMEDIA_LICENSE || "cc-by",
        maxAttempts: numeric(env.WIKIMEDIA_MAX_ATTEMPTS, 3),
      },
      fallbackUrl:
        env.FALLBACK_IMAGE_URL ||
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Globe_icon.svg/1024px-Globe_icon.svg.png",
      enablePixabay: bool(env.ENABLE_PIXABAY, false),
      pixabay: {
        apiKey: env.PIXABAY_API_KEY || "",
        baseUrl: env.PIXABAY_BASE_URL || "https://pixabay.com/api/",
      },
    },
    imageOverlay: {
      apiKey: env.API_TEMPLATE_API_KEY || "",
      baseUrl:
        env.API_TEMPLATE_BASE_URL || "https://api.apitemplate.io/v1/create",
      templateId: env.API_TEMPLATE_TEMPLATE_ID || "",
      timeoutMs: numeric(env.API_TEMPLATE_TIMEOUT_MS, 15000),
    },
  };
}

const config = loadConfig();

module.exports = config;
module.exports.loadConfig = loadConfig;
