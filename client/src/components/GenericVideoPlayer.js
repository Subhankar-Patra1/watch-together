import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';

const GenericVideoPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoType, setVideoType] = useState('unknown');

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      return videoRef.current ? videoRef.current.currentTime : 0;
    },
    getPlayerState: () => {
      if (!videoRef.current) return 0;
      return videoRef.current.paused ? 2 : 1; // 1 = playing, 2 = paused
    },
    syncVideo: (data) => {
      if (!videoRef.current) return;
      
      try {
        videoRef.current.currentTime = data.currentTime;
        
        if (data.action === 'play' && videoRef.current.paused) {
          videoRef.current.play();
        } else if (data.action === 'pause' && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      } catch (error) {
        console.warn('Error syncing generic video:', error);
      }
    }
  }));

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      setIsLoading(true);
      setError(null);
      
      // Detect video type based on URL
      if (videoUrl.includes('.m3u8')) {
        setVideoType('hls');
      } else if (videoUrl.includes('.mpd')) {
        setVideoType('dash');
      } else {
        setVideoType('direct');
      }
      
      videoRef.current.src = videoUrl;
    }
  }, [videoUrl]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleError = (e) => {
    console.error('Generic video player error:', e);
    setError('Failed to load video. The URL might not be supported or accessible.');
    setIsLoading(false);
  };

  const handlePlay = () => {
    if (onVideoAction) {
      onVideoAction('play', videoRef.current?.currentTime || 0);
    }
  };

  const handlePause = () => {
    if (onVideoAction) {
      onVideoAction('pause', videoRef.current?.currentTime || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (onVideoAction) {
      onVideoAction('timeupdate', videoRef.current?.currentTime || 0);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        controls
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        crossOrigin="anonymous"
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
            Loading video...
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
              Cannot load video
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
              {error}
            </div>
            <div style={{ fontSize: '12px', marginTop: '15px', opacity: 0.6 }}>
              Try a direct video file URL (.mp4, .webm) or streaming URL (.m3u8)
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

GenericVideoPlayer.displayName = 'GenericVideoPlayer';

export default GenericVideoPlayer;