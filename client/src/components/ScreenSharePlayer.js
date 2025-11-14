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

      
      // Set up the video element with proper audio handling
      const video = videoRef.current;
      video.srcObject = videoData.stream;
      
      // Configure audio properties to prevent feedback and distortion
      video.volume = volume; // Use controlled volume
      video.muted = isMuted; // Use controlled mute state
      
      // Set audio context properties if available
      if (video.audioTracks) {
        video.audioTracks.forEach(track => {
          track.enabled = true;
        });
      }
      
      // Auto-play the stream with better error handling
      video.play().then(() => {
        
        // Additional audio setup after play starts
        setTimeout(() => {
          video.volume = volume; // Set to controlled volume
          video.muted = isMuted; // Set to controlled mute state
        }, 100);
        
      }).catch(error => {
        
        // Try to play without audio if there's an audio issue
        if (error.name === 'NotAllowedError') {
          video.muted = true;
          video.play().catch(err => {
            console.error('Error playing muted screen share:', err);
          });
        }
      });
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