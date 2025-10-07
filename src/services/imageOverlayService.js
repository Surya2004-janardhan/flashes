const axios = require("axios");
const logger = require("../logger");
const config = require("../config");
const { truncate } = require("../utils/text");

function ensureCredentials() {
  if (!config.imageOverlay.apiKey) {
    throw new Error(
      "Missing API_TEMPLATE_API_KEY. Please set it in your .env file."
    );
  }
  if (!config.imageOverlay.templateId) {
    throw new Error(
      "Missing API_TEMPLATE_TEMPLATE_ID. Please set it in your .env file."
    );
  }
}

function buildPayload({ headline, summary, imageUrl }) {
  return {
    template_id: config.segmind.templateId,
    data: {
      headline: truncate(headline, 140),
      summary: truncate(summary, config.slides.summaryMaxLength),
      background_image: imageUrl,
    },
  };
}

async function generateSlide({ headline, summary, imageUrl }) {
  ensureCredentials();
  const payload = buildPayload({ headline, summary, imageUrl });
  const { baseUrl, timeoutMs, apiKey } = config.imageOverlay;

  try {
    const response = await axios.post(baseUrl, payload, {
      timeout: timeoutMs,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      responseType: "arraybuffer",
    });

    logger.info("API Template slide generated", {
      bytes: response.data?.byteLength || 0,
    });
    return Buffer.from(response.data);
  } catch (error) {
    const message = error.response?.data || error.message;
    logger.error("API Template API call failed", { message });
    throw new Error(
      `API Template API call failed: ${
        typeof message === "string" ? message : JSON.stringify(message)
      }`
    );
  }
}

module.exports = {
  generateSlide,
  buildPayload,
};
