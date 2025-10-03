const test = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("../src/config");

test("loadConfig respects category overrides", () => {
  const cfg = loadConfig({
    env: {
      NEWS_CATEGORIES: "top,science,technology",
      WORLD_COUNTRIES: "us,au",
      SLIDE_CONCURRENCY: "5",
      NEWSDATA_API_KEY: "demo-key",
      SEGMIND_API_KEY: "demo-segmind",
    },
  });

  assert.deepEqual(cfg.newsdata.categories, ["top", "science", "technology"]);
  assert.deepEqual(cfg.newsdata.worldCountries, ["us", "au"]);
  assert.equal(cfg.slides.concurrentJobs, 5);
});

test("loadConfig falls back to defaults when values missing", () => {
  const cfg = loadConfig({
    env: {
      NEWSDATA_API_KEY: "demo-key",
      SEGMIND_API_KEY: "demo-segmind",
    },
  });

  assert.ok(cfg.newsdata.categories.length > 0);
  assert.equal(cfg.slides.targetCount, 12);
  assert.ok(!cfg.scheduler);
});
