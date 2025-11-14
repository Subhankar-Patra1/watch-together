import React, { useState } from 'react';
import UniversalPlayer from './UniversalPlayer';
import { extractTweetId, isTwitterUrl } from '../utils/twitterUtils';

const QuickTwitterTest = () => {
  const [testUrl] = useState('https://x.com/chixxsays/status/1989018582098014450?s=20');
  const [showPlayer, setShowPlayer] = useState(false);

  const tweetId = extractTweetId(testUrl);
  const isValid = isTwitterUrl(testUrl);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Quick X/Twitter Test</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Test URL:</h3>
        <code style={{ 
          display: 'block', 
          padding: '10px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '4px',
          wordBreak: 'break-all'
        }}>
          {testUrl}
        </code>
        
        <div style={{ marginTop: '10px' }}>
          <p><strong>Valid X/Twitter URL:</strong> {isValid ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Extracted Tweet ID:</strong> {tweetId || 'None'}</p>
        </div>
        
        <button
          onClick={() => setShowPlayer(!showPlayer)}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: '#1da1f2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showPlayer ? 'Hide Player' : 'Test Player'}
        </button>
      </div>

      {showPlayer && (
        <div style={{ marginTop: '20px' }}>
          <h3>X/Twitter Video Player:</h3>
          <div style={{
            width: '100%',
            height: '400px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <UniversalPlayer
              videoData={{ url: testUrl }}
              onVideoAction={(action, data) => {
                console.log('Video action:', action, data);
              }}
            />
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Note:</strong> This is testing the X/Twitter URL you provided. The video should embed and play if the tweet is public and contains video content.</p>
      </div>
    </div>
  );
};

export default QuickTwitterTest;