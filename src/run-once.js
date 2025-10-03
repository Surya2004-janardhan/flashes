const logger = require("./logger");
const { generateSlides } = require("./slideGenerator");

(async () => {
  logger.info("Starting daily slide generation run");

  try {
    const result = await generateSlides();
    logger.info("Slide generation complete", {
      outputDir: result.outputDir,
      manifest: result.manifestPath,
      slides: result.slides.length,
    });
  } catch (error) {
    logger.error("Slide generation failed", { error: error.message });
    process.exitCode = 1;
  }
})();
