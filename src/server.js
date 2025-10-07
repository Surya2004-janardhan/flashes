const express = require("express");
const cors = require("cors");
const logger = require("./logger");
const {
  fetchLatestNews,
  fetchNewsByCategory,
} = require("./services/newsService");
const { resolveImage } = require("./services/imageService");
const { generateSlide } = require("./services/imageOverlayService");
const { generateSlides } = require("./slideGenerator");
const { extractSummary, truncate } = require("./utils/text");
const { publishToSocials } = require("./services/socialService");
const config = require("./config");
const fs = require("fs-extra");
const path = require("path");
const slugify = require("slugify");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Global function to create image (slide) from text and imageUrl
async function createImage(text, imageUrl, title = "News") {
  const truncatedText = truncate(text, config.slides.summaryMaxLength);
  const slideBuffer = await generateSlide({
    headline: title,
    summary: truncatedText,
    imageUrl,
  });

  // Save to file
  const outputDir = path.join(
    config.slides.outputDir,
    new Date().toISOString().split("T")[0],
    "slides"
  );
  await fs.ensureDir(outputDir);
  const filename = `${Date.now()}-${slugify(title, {
    lower: true,
    strict: true,
  })}.png`;
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, slideBuffer);

  return {
    filePath,
    mimeType: "image/png",
    title,
    text: truncatedText,
    imageUrl,
  };
}

// Global function to publish slide to socials
async function publishSlide(slideData, platform = "twitter") {
  return await publishToSocials(slideData, platform);
}

// Helper function for processing and publishing articles
async function processAndPublishArticles(articles, categoryName) {
  return await Promise.all(
    articles.slice(0, 5).map(async (article) => {
      // Limit to 5 per category
      const imageUrl = await resolveImage(article);
      const text = extractSummary(article);
      const slide = await createImage(text, imageUrl, article.title);
      const publishResult = await publishSlide(slide);
      return {
        article: {
          id: article.id,
          title: article.title,
          url: article.url,
          publishedAt: article.publishedAt,
        },
        imageUrl,
        text,
        slide,
        publishResult,
      };
    })
  );
}

// Endpoint to fetch latest news
app.get("/api/news", async (req, res) => {
  try {
    const articles = await fetchLatestNews();
    res.json({ success: true, data: articles });
  } catch (error) {
    logger.error("News fetch failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to resolve image for an article
app.post("/api/image", async (req, res) => {
  try {
    const { article } = req.body;
    if (!article) {
      return res
        .status(400)
        .json({ success: false, error: "Article required" });
    }
    const imageUrl = await resolveImage(article);
    res.json({ success: true, data: { imageUrl } });
  } catch (error) {
    logger.error("Image resolve failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to generate slide for an article
app.post("/api/slide", async (req, res) => {
  try {
    const { article } = req.body;
    if (!article) {
      return res
        .status(400)
        .json({ success: false, error: "Article required" });
    }
    const summary = extractSummary(article);
    const truncatedSummary = truncate(summary, config.slides.summaryMaxLength);
    const imageUrl = await resolveImage(article);
    const slide = await createImage(truncatedSummary, imageUrl, article.title);
    res.json({ success: true, data: slide });
  } catch (error) {
    logger.error("Slide generation failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to generate full set of slides
app.post("/api/generate", async (req, res) => {
  try {
    const result = await generateSlides();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("Full generation failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Category-specific endpoints with full pipeline
app.get("/api/news/politics", async (req, res) => {
  try {
    const articles = await fetchNewsByCategory("top"); // Map politics to top
    const processed = await processAndPublishArticles(articles, "Politics");
    res.json({ success: true, data: processed });
  } catch (error) {
    logger.error("Politics news pipeline failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/news/cinema", async (req, res) => {
  try {
    const articles = await fetchNewsByCategory("entertainment"); // Map cinema to entertainment
    const processed = await processAndPublishArticles(articles, "Cinema");
    res.json({ success: true, data: processed });
  } catch (error) {
    logger.error("Cinema news pipeline failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/news/sports", async (req, res) => {
  try {
    const articles = await fetchNewsByCategory("sports");
    const processed = await processAndPublishArticles(articles, "Sports");
    res.json({ success: true, data: processed });
  } catch (error) {
    logger.error("Sports news pipeline failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
