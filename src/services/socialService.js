const { TwitterApi } = require("twitter-api-v2");
const logger = require("../logger");

// Placeholder for social media publishing
// Now using Twitter API v2 for real posting.

let twitterClient = null;

function initTwitter() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    logger.warn("Twitter API keys not set, using placeholder");
    return null;
  }

  twitterClient = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });
}

async function publishToSocials(slideData, platform = "twitter") {
  if (platform !== "twitter") {
    logger.warn(`Platform ${platform} not supported`);
    return { success: false, error: "Platform not supported" };
  }

  if (!twitterClient) {
    initTwitter();
    if (!twitterClient) {
      logger.info(
        `[SOCIAL] Placeholder post to ${platform}: ${slideData.title}`
      );
      return { success: true, postId: `placeholder-${Date.now()}` };
    }
  }

  try {
    // Upload media
    const mediaId = await twitterClient.v1.uploadMedia(slideData.filePath);

    // Post tweet with media
    const tweet = await twitterClient.v2.tweet({
      text: slideData.title,
      media: { media_ids: [mediaId] },
    });

    logger.info(`Posted to Twitter: ${tweet.data.id}`);
    return { success: true, postId: tweet.data.id };
  } catch (error) {
    logger.error("Twitter API error", { error: error.message });
    return { success: false, error: error.message };
  }
}

module.exports = {
  publishToSocials,
};
