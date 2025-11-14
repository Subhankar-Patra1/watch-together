import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { extractTweetId, generateTwitterEmbedUrl, isTwitterUrl } from '../utils/twitterUtils';

const EmbedVideoPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      // Embedded videos don't provide time access
      return 0;
    },
    getPlayerState: () => {
      // Embedded videos don't provide state access
      return 1; // Assume playing
    },
    syncVideo: (data) => {
      // Embedded videos can't be synced
      console.warn('Sync not supported for embedded videos');
    }
  }));

  const getEmbedUrl = (url) => {
    console.log('🎬 EmbedVideoPlayer processing URL:', url);
    // Convert various video URLs to embeddable formats

    // Vimeo
    if (url.includes('vimeo.com')) {
      const vimeoId = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId[1]}?autoplay=0`;
      }
    }

    // Dailymotion
    if (url.includes('dailymotion.com')) {
      const dmId = url.match(/dailymotion\.com\/video\/([^_]+)/);
      if (dmId) {
        return `https://www.dailymotion.com/embed/video/${dmId[1]}`;
      }
    }

    // Twitch
    if (url.includes('twitch.tv')) {
      const twitchId = url.match(/twitch\.tv\/videos\/(\d+)/);
      if (twitchId) {
        return `https://player.twitch.tv/?video=${twitchId[1]}&parent=${window.location.hostname}`;
      }
    }

    // Facebook
    if (url.includes('facebook.com')) {
      // Handle different Facebook video URL formats
      let fbVideoId = null;

      // Format: facebook.com/share/v/VIDEO_ID/
      const shareMatch = url.match(/facebook\.com\/share\/v\/([^\/\?]+)/);
      if (shareMatch) {
        fbVideoId = shareMatch[1];
      }

      // Format: facebook.com/videos/VIDEO_ID
      const videosMatch = url.match(/facebook\.com\/videos\/(\d+)/);
      if (videosMatch) {
        fbVideoId = videosMatch[1];
      }

      // Format: facebook.com/watch/?v=VIDEO_ID
      const watchMatch = url.match(/facebook\.com\/watch\/\?v=(\d+)/);
      if (watchMatch) {
        fbVideoId = watchMatch[1];
      }

      if (fbVideoId) {
        // Facebook embed URL format
        const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=734&height=411&appId`;
        console.log('🎬 Facebook embed URL:', embedUrl);
        return embedUrl;
      }
    }

    // X (Twitter)
    if (isTwitterUrl(url)) {
      const tweetId = extractTweetId(url);
      
      if (tweetId) {
        // Use the utility function to generate embed URL with optimized parameters for video
        const embedUrl = generateTwitterEmbedUrl(tweetId, {
          theme: 'dark',
          width: 600,
          height: 450,
          conversation: 'none',
          cards: 'hidden',
          chrome: 'noheader nofooter noborders'
        });
        console.log('🎬 Twitter/X embed URL:', embedUrl);
        return embedUrl;
      }
    }
    
    // Streamable
    if (url.includes('streamable.com')) {
      const streamableId = url.match(/streamable\.com\/([a-zA-Z0-9]+)/);
      if (streamableId) {
        return `https://streamable.com/e/${streamableId[1]}`;
      }
    }

    // For other URLs, try to use them directly
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    let errorMessage = 'Failed to load embedded video. ';

    if (videoUrl.includes('facebook.com')) {
      errorMessage += 'Facebook videos often have privacy restrictions that prevent embedding. Try a public Facebook video or use a different platform.';
    } else if (videoUrl.includes('instagram.com')) {
      errorMessage += 'Instagram videos cannot be embedded due to platform restrictions.';
    } else if (videoUrl.includes('tiktok.com')) {
      errorMessage += 'TikTok videos may have embedding restrictions.';
    } else if (videoUrl.includes('twitter.com') || videoUrl.includes('x.com')) {
      errorMessage += 'X/Twitter videos may have privacy restrictions or the tweet might not contain video content. Make sure the tweet is public and contains a video.';
    } else {
      errorMessage += 'The platform might not support embedding or the URL is invalid.';
    }

    setError(errorMessage);
    setIsLoading(false);
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative', 
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <iframe
        src={embedUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          maxWidth: isTwitterUrl(videoUrl) ? '600px' : '100%',
          maxHeight: isTwitterUrl(videoUrl) ? '450px' : '100%'
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            fontSize: '16px',
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #333',
                borderTop: '3px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 10px',
              }}
            />
            Loading embedded video...
          </div>
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ff6b6b',
            fontSize: '16px',
            zIndex: 10,
            padding: '20px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              Cannot load embedded video
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
              {error}
            </div>
            <div style={{ fontSize: '12px', marginTop: '15px', opacity: 0.6 }}>
              Note: Embedded videos cannot be synced between users
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

EmbedVideoPlayer.displayName = 'EmbedVideoPlayer';

export default EmbedVideoPlayer;