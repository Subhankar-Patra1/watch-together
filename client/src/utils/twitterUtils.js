/**
 * Utility functions for handling X (formerly Twitter) URLs and video content
 */

/**
 * Extract tweet ID from various X/Twitter URL formats
 * @param {string} url - The X/Twitter URL
 * @returns {string|null} - The tweet ID or null if not found
 */
export const extractTweetId = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Normalize the URL to handle different formats
  const normalizedUrl = url.toLowerCase();

  // Format: twitter.com/user/status/TWEET_ID or x.com/user/status/TWEET_ID
  const statusMatch = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i);
  if (statusMatch) {
    return statusMatch[1];
  }

  // Format: twitter.com/i/status/TWEET_ID or x.com/i/status/TWEET_ID
  const iStatusMatch = url.match(/(?:twitter\.com|x\.com)\/i\/status\/(\d+)/i);
  if (iStatusMatch) {
    return iStatusMatch[1];
  }

  // Format: mobile.twitter.com or mobile.x.com
  const mobileMatch = url.match(/(?:mobile\.twitter\.com|mobile\.x\.com)\/[^/]+\/status\/(\d+)/i);
  if (mobileMatch) {
    return mobileMatch[1];
  }

  // Format: t.co redirects (common in shared links)
  if (normalizedUrl.includes('t.co/')) {
    // For t.co links, we'd need to resolve the redirect
    // For now, return null as we can't extract ID directly
    console.warn('t.co links need to be resolved first');
    return null;
  }

  return null;
};

/**
 * Check if a URL is a valid X/Twitter URL that might contain video
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's a valid X/Twitter URL
 */
export const isTwitterUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const normalizedUrl = url.toLowerCase();
  
  // Check for various Twitter/X domains
  const twitterDomains = [
    'twitter.com',
    'x.com',
    'mobile.twitter.com',
    'mobile.x.com',
    'm.twitter.com',
    'm.x.com'
  ];

  const hasTwitterDomain = twitterDomains.some(domain => normalizedUrl.includes(domain));
  
  // Must have a status URL (where tweets/videos are located)
  const hasStatus = normalizedUrl.includes('/status/') || normalizedUrl.includes('/i/status/');
  
  return hasTwitterDomain && hasStatus;
};

/**
 * Generate an embed URL for X/Twitter content
 * @param {string} tweetId - The tweet ID
 * @param {object} options - Embed options
 * @returns {string} - The embed URL
 */
export const generateTwitterEmbedUrl = (tweetId, options = {}) => {
  if (!tweetId) {
    return null;
  }

  const {
    theme = 'dark',
    width = 550,
    height = 400,
    conversation = 'none',
    cards = 'hidden',
    chrome = 'noheader nofooter noborders'
  } = options;

  const params = new URLSearchParams({
    id: tweetId,
    theme,
    width: width.toString(),
    height: height.toString(),
    conversation,
    cards,
    chrome
  });

  return `https://platform.twitter.com/embed/Tweet.html?${params.toString()}`;
};

/**
 * Check if a tweet URL likely contains video content
 * This is a heuristic check based on URL patterns
 * @param {string} url - The X/Twitter URL
 * @returns {boolean} - True if it likely contains video
 */
export const likelyContainsVideo = (url) => {
  if (!isTwitterUrl(url)) {
    return false;
  }

  // Some heuristics for video content
  // Note: This is not foolproof, but can help with detection
  const videoIndicators = [
    'video',
    'watch',
    'play',
    'media'
  ];

  const normalizedUrl = url.toLowerCase();
  return videoIndicators.some(indicator => normalizedUrl.includes(indicator));
};

const twitterUtils = {
  extractTweetId,
  isTwitterUrl,
  generateTwitterEmbedUrl,
  likelyContainsVideo
};

export default twitterUtils;