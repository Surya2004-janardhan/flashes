const axios = require("axios");
const logger = require("../logger");
const config = require("../config");
const { truncate } = require("../utils/text");

function ensureCredentials() {
  if (!config.segmind.apiKey) {
    throw new Error(
      "Missing SEGMIND_API_KEY. Please set it in your .env file."
    );
  }
}

function buildPayload({ headline, summary, imageUrl }) {
  const {
    title: titleStyle,
    body: bodyStyle,
    overlay: overlayStyle,
  } = config.segmind;

  return {
    background_image_url: imageUrl,
    canvas: {
      width: overlayStyle.width,
      height: overlayStyle.height,
      padding: overlayStyle.padding,
      theme: overlayStyle.theme,
      format: "png",
    },
    texts: [
      {
        content: truncate(headline, 140),
        font_family: titleStyle.fontFamily,
        font_size: titleStyle.fontSize,
        color: titleStyle.color,
        align: titleStyle.align,
        anchor: "top",
      },
      {
        content: truncate(summary, config.slides.summaryMaxLength),
        font_family: bodyStyle.fontFamily,
        font_size: bodyStyle.fontSize,
        color: bodyStyle.color,
        align: bodyStyle.align,
        anchor: "center",
      },
    ],
  };
}

async function generateSlide({ headline, summary, imageUrl }) {
  ensureCredentials();
  const payload = buildPayload({ headline, summary, imageUrl });
  const { baseUrl, timeoutMs, apiKey } = config.segmind;

  try {
    const response = await axios.post(baseUrl, payload, {
      timeout: timeoutMs,
      responseType: "arraybuffer",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
    });

    logger.info("Segmind slide generated", {
      bytes: response.data?.byteLength || 0,
    });
    return Buffer.from(response.data);
  } catch (error) {
    const message = error.response?.data || error.message;
    logger.error("Segmind API call failed", { message });
    throw new Error(
      `Segmind API call failed: ${
        typeof message === "string" ? message : JSON.stringify(message)
      }`
    );
  }
}

module.exports = {
  generateSlide,
  buildPayload,
};
