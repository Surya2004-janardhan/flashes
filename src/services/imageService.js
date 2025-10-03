const axios = require("axios");
const { URL } = require("node:url");
const config = require("../config");
const logger = require("../logger");

async function queryWikimedia(term) {
  const { baseUrl, maxAttempts } = config.images.wikimedia;
  const params = {
    action: "query",
    generator: "search",
    gsrsearch: term,
    gsrlimit: 5,
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: 1920,
    format: "json",
    origin: "*",
  };

  try {
    const response = await axios.get(baseUrl, { params, timeout: 10000 });
    const pages = response.data?.query?.pages;
    if (!pages) return null;
    const candidates = Object.values(pages)
      .map((page) => page.imageinfo?.[0]?.url)
      .filter(Boolean);
    return candidates.slice(0, maxAttempts);
  } catch (error) {
    logger.debug("Wikimedia query failed", { term, error: error.message });
    return null;
  }
}

async function queryPixabay(term) {
  if (!config.images.enablePixabay || !config.images.pixabay.apiKey) {
    return null;
  }

  const params = {
    key: config.images.pixabay.apiKey,
    q: term,
    image_type: "photo",
    safesearch: true,
    per_page: 5,
  };

  try {
    const response = await axios.get(config.images.pixabay.baseUrl, {
      params,
      timeout: 10000,
    });
    const hits = response.data?.hits;
    if (!Array.isArray(hits) || !hits.length) return null;
    return hits
      .map((hit) => hit.largeImageURL)
      .filter(Boolean)
      .slice(0, 3);
  } catch (error) {
    logger.debug("Pixabay query failed", { term, error: error.message });
    return null;
  }
}

async function validateImageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    const head = await axios.head(url, { timeout: 8000, validateStatus: null });
    if (head.status >= 200 && head.status < 400) {
      const contentType = head.headers["content-type"] || "";
      if (contentType.startsWith("image/")) {
        return true;
      }
    }
  } catch (error) {
    logger.debug("Image validation failed", { url, error: error.message });
  }
  return false;
}

function buildSearchTerms(article) {
  const base = [];
  if (article.title) base.push(article.title);
  if (article.category) base.push(`${article.category} news`);
  if (article.region && article.category)
    base.push(`${article.region} ${article.category}`);
  if (article.source) base.push(`${article.source} news coverage`);
  return base.filter(Boolean);
}

async function resolveImage(article) {
  const existing = article.imageUrl;
  if (await validateImageUrl(existing)) {
    logger.debug("Using image supplied by article", { url: existing });
    return existing;
  }

  const terms = buildSearchTerms(article);
  terms.push("breaking news background");
  terms.push(`${article.region || "global"} skyline`);

  for (const term of terms) {
    const wikimediaCandidates = await queryWikimedia(term);
    if (Array.isArray(wikimediaCandidates)) {
      for (const candidate of wikimediaCandidates) {
        if (await validateImageUrl(candidate)) {
          logger.debug("Using Wikimedia image", { term, candidate });
          return candidate;
        }
      }
    }

    const pixabayCandidates = await queryPixabay(term);
    if (Array.isArray(pixabayCandidates)) {
      for (const candidate of pixabayCandidates) {
        if (await validateImageUrl(candidate)) {
          logger.debug("Using Pixabay image", { term, candidate });
          return candidate;
        }
      }
    }
  }

  logger.warn("Falling back to default image", { title: article.title });
  return config.images.fallbackUrl;
}

module.exports = {
  resolveImage,
};
