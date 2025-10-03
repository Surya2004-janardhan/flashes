const cron = require("node-cron");
const logger = require("./logger");
const config = require("./config");
const { generateSlides } = require("./slideGenerator");

async function runJob() {
  logger.info("Scheduled job triggered");
  try {
    const result = await generateSlides();
    logger.info("Scheduled slide generation complete", {
      outputDir: result.outputDir,
      slides: result.slides.length,
    });
  } catch (error) {
    logger.error("Scheduled job failed", { error: error.message });
  }
}

function startScheduler() {
  const { cron: cronExpression, timezone, runOnStart } = config.scheduler;

  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  logger.info("Starting scheduler", { cron: cronExpression, timezone });
  const task = cron.schedule(cronExpression, runJob, {
    timezone,
    runOnInit: Boolean(runOnStart),
  });

  if (runOnStart) {
    logger.info("Running initial job immediately");
    runJob();
  }

  return task;
}

if (require.main === module) {
  try {
    startScheduler();
  } catch (error) {
    logger.error("Failed to start scheduler", { error: error.message });
    process.exitCode = 1;
  }
}

module.exports = {
  startScheduler,
};
