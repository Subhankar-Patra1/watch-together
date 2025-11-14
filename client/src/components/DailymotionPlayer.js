import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';

const DailymotionPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const isUserAction = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useImperativeHandle(ref, () => ({
    syncVideo: (data) => {
      if (playerRef.current && !isUserAction.current) {
        try {
          // Sync time
          playerRef.current.seek(data.currentTime);
          
          // Sync play/pause state
          if (data.action === 'play') {
            playerRef.current.play();
          } else if (data.action === 'pause') {
            playerRef.current.pause();
          }
        } catch (error) {
          console.warn('Dailymotion sync error:', error);
        }
      }
    },
    getCurrentTime: () => {
      if (playerRef.current) {
        try {
          return playerRef.current.currentTime || 0;
        } catch (error) {
          console.warn('Dailymotion getCurrentTime error:', error);
          return 0;
        }
      }
      return 0;
    },
    getPlayerState: () => {
      if (playerRef.current) {
        try {
          return playerRef.current.paused ? 2 : 1; // 1 = playing, 2 = paused
        } catch (error) {
          console.warn('Dailymotion getPlayerState error:', error);
          return 1;
        }
      }
      return 1;
    }
  }));

  useEffect(() => {
    const loadDailymotionPlayer = async () => {
      try {
        // Load Dailymotion Player SDK
        if (!window.DM) {
          const script = document.createElement('script');
          script.src = 'https://www.dailymotion.com/static/cloudsdk/dm.js';
          script.onload = initializePlayer;
          document.head.appendChild(script);
        } else {
          initializePlayer();
        }
      } catch (error) {
        setError('Failed to load Dailymotion player');
        setIsLoading(false);
      }
    };

    const initializePlayer = () => {
      if (!containerRef.current) return;

      try {
        // Extract Dailymotion video ID
        const dmId = videoUrl.match(/dailymotion\.com\/video\/([^_?]+)/)?.[1];
        if (!dmId) {
          setError('Invalid Dailymotion URL');
          setIsLoading(false);
          return;
        }

        // Create Dailymotion player
        playerRef.current = window.DM.player(containerRef.current, {
          video: dmId,
          width: '100%',
          height: '100%',
          params: {
            autoplay: false,
            mute: false,
            'queue-enable': false,
            'sharing-enable': false,
            'ui-highlight': '#00adef',
            'ui-theme': 'dark'
          }
        });

        // Set up event listeners
        playerRef.current.addEventListener('play', () => {
          if (isUserAction.current) {
            const currentTime = playerRef.current.currentTime || 0;
            onVideoAction('play', currentTime);
          }
        });

        playerRef.current.addEventListener('pause', () => {
          if (isUserAction.current) {
            const currentTime = playerRef.current.currentTime || 0;
            onVideoAction('pause', currentTime);
          }
        });

        playerRef.current.addEventListener('seeking', () => {
          if (isUserAction.current) {
            const currentTime = playerRef.current.currentTime || 0;
            onVideoAction('seek', currentTime);
          }
        });

        playerRef.current.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          isUserAction.current = true; // Enable user action tracking
        });

        playerRef.current.addEventListener('error', (error) => {
          setError('Dailymotion player error: ' + (error.message || 'Unknown error'));
          setIsLoading(false);
        });

      } catch (error) {
        setError('Failed to initialize Dailymotion player');
        setIsLoading(false);
      }
    };

    loadDailymotionPlayer();

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Dailymotion player:', error);
        }
      }
    };
  }, [videoUrl, onVideoAction]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {isLoading && (
        <div style={{
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
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #333',
              borderTop: '3px solid #ff6900',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px',
            }} />
            Loading Dailymotion video...
          </div>
        </div>
      )}

      {error && (
        <div style={{
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
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              Dailymotion Player Error
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DailymotionPlayer.displayName = 'DailymotionPlayer';

export default DailymotionPlayer;