const path = require("node:path");
const fs = require("fs-extra");
const slugify = require("slugify");
const { default: pLimit } = require("p-limit");
const config = require("./config");
const logger = require("./logger");
const { fetchLatestNews } = require("./services/newsService");
const { resolveImage } = require("./services/imageService");
const { generateSlide } = require("./services/imageOverlayService");
const { extractSummary, truncate } = require("./utils/text");

const limit = pLimit(config.slides.concurrentJobs);

function todaysFolder() {
  const now = new Date();
  const stamp = now.toISOString().split("T")[0];
  return path.join(config.slides.outputDir, stamp);
}

function buildFilename(index, headline) {
  const slug = slugify(headline, {
    lower: true,
    strict: true,
    trim: true,
  });
  const base = slug || `${config.slides.filenamePrefix}-${index + 1}`;
  return `${String(index + 1).padStart(2, "0")}-${base}.png`;
}

async function prepareOutputDirectory(targetDir) {
  await fs.ensureDir(targetDir);
  await fs.ensureDir(path.join(targetDir, "artifacts"));
}

async function writeManifest(targetDir, records) {
  const manifestPath = path.join(targetDir, config.slides.manifestName);
  const payload = {
    generatedAt: new Date().toISOString(),
    slideCount: records.length,
    slides: records.map((record) => ({
      file: path.basename(record.filePath),
      headline: record.article.title,
      summary: record.summary,
      category: record.article.category,
      region: record.article.region,
      source: record.article.source,
      url: record.article.url,
    })),
  };
  await fs.writeJson(manifestPath, payload, { spaces: 2 });
  return manifestPath;
}

async function createSingleSlide(article, index, targetDir) {
  const summaryRaw = extractSummary(article);
  const summary = truncate(summaryRaw, config.slides.summaryMaxLength);
  const imageUrl = await resolveImage(article);

  const slideBuffer = await generateSlide({
    headline: article.title,
    summary,
    imageUrl,
  });

  const filename = buildFilename(index, article.title);
  const filePath = path.join(targetDir, filename);

  await fs.writeFile(filePath, slideBuffer);

  return {
    article,
    summary,
    imageUrl,
    filePath,
  };
}

async function generateSlides() {
  const articles = await fetchLatestNews();
  if (!articles.length) {
    throw new Error(
      "No articles returned from Newsdata.io. Cannot generate slides."
    );
  }

  const targetCount = config.slides.targetCount;
  const limitedArticles = articles.slice(0, targetCount);
  if (limitedArticles.length < targetCount) {
    logger.warn("Fewer articles than requested", {
      expected: targetCount,
      actual: limitedArticles.length,
    });
  }

  const targetDir = todaysFolder();
  await prepareOutputDirectory(targetDir);

  const slideRecords = await Promise.all(
    limitedArticles.map((article, index) =>
      limit(() =>
        createSingleSlide(article, index, targetDir).catch((error) => {
          logger.error("Failed to create slide", {
            title: article.title,
            error: error.message,
          });
          return null;
        })
      )
    )
  );

  const successful = slideRecords.filter(Boolean);
  if (successful.length < 10) {
    throw new Error(
      `Only ${successful.length} slides generated; need at least 10. Check logs for failures.`
    );
  }

  const manifestPath = await writeManifest(targetDir, successful);

  return {
    outputDir: targetDir,
    manifestPath,
    slides: successful,
  };
}

module.exports = {
  generateSlides,
};
