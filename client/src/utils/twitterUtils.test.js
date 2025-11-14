/**
 * Tests for X/Twitter utility functions
 */

import { 
  extractTweetId, 
  isTwitterUrl, 
  generateTwitterEmbedUrl, 
  likelyContainsVideo 
} from './twitterUtils';

// Test data - various X/Twitter URL formats
const testUrls = {
  valid: [
    'https://twitter.com/user/status/1234567890',
    'https://x.com/user/status/1234567890',
    'https://mobile.twitter.com/user/status/1234567890',
    'https://twitter.com/i/status/1234567890',
    'https://x.com/i/status/1234567890',
    'https://m.twitter.com/user/status/1234567890'
  ],
  invalid: [
    'https://twitter.com/user',
    'https://x.com/user/followers',
    'https://youtube.com/watch?v=123',
    'https://facebook.com/video/123',
    'not-a-url',
    null,
    undefined
  ]
};

// Manual test function (since we don't have a test runner setup)
const runTests = () => {
  console.log('🧪 Running X/Twitter Utils Tests...\n');

  // Test extractTweetId
  console.log('Testing extractTweetId:');
  testUrls.valid.forEach(url => {
    const tweetId = extractTweetId(url);
    console.log(`✅ ${url} -> ${tweetId}`);
    if (tweetId !== '1234567890') {
      console.error(`❌ Expected '1234567890', got '${tweetId}'`);
    }
  });

  testUrls.invalid.forEach(url => {
    const tweetId = extractTweetId(url);
    console.log(`✅ ${url} -> ${tweetId} (should be null)`);
    if (tweetId !== null) {
      console.error(`❌ Expected null, got '${tweetId}'`);
    }
  });

  // Test isTwitterUrl
  console.log('\nTesting isTwitterUrl:');
  testUrls.valid.forEach(url => {
    const isValid = isTwitterUrl(url);
    console.log(`✅ ${url} -> ${isValid} (should be true)`);
    if (!isValid) {
      console.error(`❌ Expected true, got ${isValid}`);
    }
  });

  testUrls.invalid.forEach(url => {
    const isValid = isTwitterUrl(url);
    console.log(`✅ ${url} -> ${isValid} (should be false)`);
    if (isValid) {
      console.error(`❌ Expected false, got ${isValid}`);
    }
  });

  // Test generateTwitterEmbedUrl
  console.log('\nTesting generateTwitterEmbedUrl:');
  const embedUrl = generateTwitterEmbedUrl('1234567890');
  console.log(`✅ Embed URL: ${embedUrl}`);
  if (!embedUrl.includes('1234567890')) {
    console.error('❌ Embed URL should contain tweet ID');
  }

  // Test with custom options
  const customEmbedUrl = generateTwitterEmbedUrl('1234567890', {
    theme: 'light',
    width: 600,
    height: 500
  });
  console.log(`✅ Custom Embed URL: ${customEmbedUrl}`);

  console.log('\n🎉 Tests completed!');
};

// Export for potential use in other test files
export { runTests };

// If running directly in browser console or Node
if (typeof window !== 'undefined') {
  window.testTwitterUtils = runTests;
}

export default runTests;