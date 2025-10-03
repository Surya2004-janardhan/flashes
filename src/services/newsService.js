const axios = require("axios");
const pLimit = require("p-limit");
const config = require("../config");
const logger = require("../logger");

const limit = pLimit(4);

const DATE_FIELDS = ["pubDate", "published_at", "created_at"];

function parsePublishedDate(article) {
  for (const field of DATE_FIELDS) {
    if (article[field]) {
      const parsed = Date.parse(article[field]);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed);
      }
    }
  }
  return null;
}

function normalizeArticle(article, context) {
  const publishedAt = parsePublishedDate(article);
  return {
    id:
      article.article_id ||
      article.link ||
      `${context.category}-${context.region}-${Math.random()}`,
    title: article.title?.trim() || "Untitled headline",
    url: article.link,
    category: context.category,
    region: context.region,
    publishedAt,
    source: article.source_id,
    description: article.description,
    content: article.content,
    imageUrl: article.image_url || article.image,
    fullArticle: article,
  };
}

async function fetchSingleBatch(params) {
  const { category, country, language, region } = params;
  const { apiKey, baseUrl, requestTimeoutMs, maxArticlesPerCategory } =
    config.newsdata;

  const requestParams = {
    apikey: apiKey,
    category,
    language,
    country,
    page: 1,
  };

  const response = await axios.get(baseUrl, {
    params: requestParams,
    timeout: requestTimeoutMs,
  });

  const payload = response.data;
  if (payload.status && payload.status !== "success") {
    const message = payload.message || "Unknown error";
    throw new Error(`Newsdata API error: ${message}`);
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  const slice = results.slice(0, maxArticlesPerCategory);
  return slice.map((article) =>
    normalizeArticle(article, { category, region })
  );
}

async function fetchLatestNews() {
  if (!config.newsdata.apiKey) {
    throw new Error(
      "Missing NEWSDATA_API_KEY. Please set it in your .env file."
    );
  }

  const tasks = [];
  const { categories, indiaCountryCode, worldCountries, languages } =
    config.newsdata;
  const primaryLanguage = languages[0];

  for (const category of categories) {
    tasks.push(
      limit(() =>
        fetchSingleBatch({
          category,
          country: indiaCountryCode,
          language: primaryLanguage,
          region: "india",
        }).catch((error) => {
          logger.warn(
            `Failed to fetch India news for category "${category}"`,
            error.message
          );
          return [];
        })
      )
    );

    for (const country of worldCountries) {
      tasks.push(
        limit(() =>
          fetchSingleBatch({
            category,
            country,
            language: primaryLanguage,
            region: "world",
          }).catch((error) => {
            logger.warn(
              `Failed to fetch world news for category "${category}" (${country})`,
              error.message
            );
            return [];
          })
        )
      );
    }
  }

  const results = await Promise.all(tasks);
  const flattened = results.flat();

  const seen = new Set();
  const deduped = [];
  for (const article of flattened) {
    if (!article.title) continue;
    const key = `${article.title.toLowerCase()}::${article.region}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(article);
  }

  deduped.sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  logger.info("Fetched articles", {
    requested: tasks.length,
    unique: deduped.length,
  });

  return deduped;
}

module.exports = {
  fetchLatestNews,
};
