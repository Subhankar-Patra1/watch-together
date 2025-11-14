import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import './ScreenSharePlayer.css';

const ScreenSharePlayer = forwardRef(({ videoData, onVideoAction }, ref) => {
  const videoRef = useRef(null);
  const [volume, setVolume] = useState(0.6); // Start with lower volume
  const [isMuted, setIsMuted] = useState(false);
  


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
      
      // Screen sharing doesn't need sync as it's live
      console.log('Screen share sync ignored - live stream');
    }
  }));

  useEffect(() => {
    if (videoRef.current && videoData && videoData.stream) {
      const video = videoRef.current;
      video.srcObject = videoData.stream;

      // Apply current audio prefs first
      video.volume = volume;
      video.muted = isMuted;

      const tryPlay = async (withMuteFallback = true) => {
        try {
          await video.play();
          // Re-apply in case the browser tweaked them
          setTimeout(() => {
            if (!video) return;
            video.volume = volume;
            video.muted = isMuted;
          }, 100);
        } catch (err) {
          // Typical autoplay block on unmuted media
          if (withMuteFallback && err && err.name === 'NotAllowedError') {
            video.muted = true;
            try {
              await video.play();
            } catch (err2) {
              console.error('Screen share play blocked even when muted:', err2);
            }
          } else {
            console.error('Screen share play error:', err);
          }
        }
      };

      // Kick off playback
      tryPlay(true);

      // If metadata loads but we still aren't playing, try again
      const onCanPlay = () => {
        if (video.paused) {
          tryPlay(false);
        }
      };
      video.addEventListener('canplay', onCanPlay, { once: true });

      return () => {
        video.removeEventListener('canplay', onCanPlay);
      };
    }
  }, [videoData, volume, isMuted]);

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

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
  };

  if (!videoData || !videoData.stream) {
    return (
      <div className="screen-share-placeholder">
        <p>No screen share active</p>
      </div>
    );
  }

  return (
    <div className="screen-share-player">
      <div className="screen-share-header">
        <span className="screen-share-indicator">
          🖥️ {videoData.username} is sharing their screen
        </span>
        <div className="screen-share-controls">
          <button 
            className="volume-btn" 
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="volume-slider"
            title="Volume"
          />
          <span className="volume-text">{Math.round(volume * 100)}%</span>
        </div>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        controls={false}
        className="screen-share-video"
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          // Set optimal audio properties when metadata is loaded
          if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
          }
        }}
        onError={(e) => console.error('Video error:', e)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: '#000'
        }}
      />
    </div>
  );
});

ScreenSharePlayer.displayName = 'ScreenSharePlayer';

export default ScreenSharePlayer;