import React, { useState } from 'react';
import UniversalPlayer from './UniversalPlayer';
import { isTwitterUrl, extractTweetId } from '../utils/twitterUtils';

const TwitterVideoDemo = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [urlStatus, setUrlStatus] = useState('');

  // Sample X/Twitter video URLs for testing
  const sampleUrls = [
    'https://twitter.com/SpaceX/status/1234567890', // Example SpaceX video
    'https://x.com/elonmusk/status/1234567890', // Example from X.com
    'https://twitter.com/i/status/1234567890', // Direct status format
    'https://mobile.twitter.com/NASA/status/1234567890' // Mobile format
  ];

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setVideoUrl(url);
    
    if (!url) {
      setUrlStatus('');
      return;
    }

    if (isTwitterUrl(url)) {
      const tweetId = extractTweetId(url);
      if (tweetId) {
        setUrlStatus(`✅ Valid X/Twitter URL (Tweet ID: ${tweetId})`);
      } else {
        setUrlStatus('⚠️ X/Twitter URL detected but could not extract tweet ID');
      }
    } else {
      setUrlStatus('❌ Not a valid X/Twitter URL');
    }
  };

  const handleLoadVideo = () => {
    if (isTwitterUrl(videoUrl)) {
      setCurrentVideo({ url: videoUrl });
    }
  };

  const handleSampleUrl = (url) => {
    setVideoUrl(url);
    handleUrlChange({ target: { value: url } });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>X (Twitter) Video Player Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Enter X/Twitter Video URL:</h3>
        <input
          type="text"
          value={videoUrl}
          onChange={handleUrlChange}
          placeholder="https://twitter.com/user/status/1234567890 or https://x.com/user/status/1234567890"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '10px'
          }}
        />
        
        {urlStatus && (
          <div style={{
            padding: '8px',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: urlStatus.includes('✅') ? '#d4edda' : 
                           urlStatus.includes('⚠️') ? '#fff3cd' : '#f8d7da',
            color: urlStatus.includes('✅') ? '#155724' : 
                   urlStatus.includes('⚠️') ? '#856404' : '#721c24',
            border: `1px solid ${urlStatus.includes('✅') ? '#c3e6cb' : 
                                urlStatus.includes('⚠️') ? '#ffeaa7' : '#f5c6cb'}`,
            marginBottom: '10px'
          }}>
            {urlStatus}
          </div>
        )}
        
        <button
          onClick={handleLoadVideo}
          disabled={!isTwitterUrl(videoUrl)}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: isTwitterUrl(videoUrl) ? '#1da1f2' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isTwitterUrl(videoUrl) ? 'pointer' : 'not-allowed'
          }}
        >
          Load X/Twitter Video
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Sample URLs (for testing):</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {sampleUrls.map((url, index) => (
            <button
              key={index}
              onClick={() => handleSampleUrl(url)}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {url}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Note: These are example URLs. Replace the tweet IDs with actual tweet IDs that contain videos.
        </p>
      </div>

      {currentVideo && (
        <div style={{ marginTop: '20px' }}>
          <h3>Video Player:</h3>
          <div style={{
            width: '100%',
            height: '400px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <UniversalPlayer
              videoData={currentVideo}
              onVideoAction={(action, data) => {
                console.log('Video action:', action, data);
              }}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4>Supported X/Twitter URL Formats:</h4>
        <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <li><code>https://twitter.com/username/status/1234567890</code></li>
          <li><code>https://x.com/username/status/1234567890</code></li>
          <li><code>https://twitter.com/i/status/1234567890</code></li>
          <li><code>https://x.com/i/status/1234567890</code></li>
          <li><code>https://mobile.twitter.com/username/status/1234567890</code></li>
          <li><code>https://mobile.x.com/username/status/1234567890</code></li>
        </ul>
        
        <h4 style={{ marginTop: '15px' }}>Features:</h4>
        <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <li>Automatic tweet ID extraction from various URL formats</li>
          <li>Embedded video player with dark theme</li>
          <li>Error handling for private or invalid tweets</li>
          <li>Responsive design that fits your video player area</li>
          <li>Support for both twitter.com and x.com domains</li>
        </ul>
      </div>
    </div>
  );
};

export default TwitterVideoDemo;