import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import EmbedVideoPlayer from './EmbedVideoPlayer';

const SyncFallbackPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
  const [syncData, setSyncData] = useState(null);
  const [showSyncOverlay, setShowSyncOverlay] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useImperativeHandle(ref, () => ({
    syncVideo: (data) => {
      // For embedded videos that can't be controlled, show sync instructions
      setSyncData(data);
      setShowSyncOverlay(true);
      
      // Start countdown for manual sync
      let count = 3;
      setCountdown(count);
      
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);
        
        if (count <= 0) {
          clearInterval(countdownInterval);
          setShowSyncOverlay(false);
        }
      }, 1000);
    },
    getCurrentTime: () => {
      // Can't get actual time from embedded videos
      return 0;
    },
    getPlayerState: () => {
      // Can't get actual state from embedded videos
      return 1;
    }
  }));

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <EmbedVideoPlayer
        videoUrl={videoUrl}
        onVideoAction={onVideoAction}
      />
      
      {/* Sync Overlay for Manual Sync Instructions */}
      {showSyncOverlay && syncData && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          color: '#fff',
          fontSize: '18px',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
            <div style={{ fontSize: '24px', marginBottom: '15px', fontWeight: 'bold' }}>
              Manual Sync Required
            </div>
            <div style={{ fontSize: '16px', marginBottom: '10px', opacity: 0.9 }}>
              Please manually {syncData.action} the video
            </div>
            <div style={{ fontSize: '16px', marginBottom: '20px', opacity: 0.9 }}>
              and seek to: <strong>{formatTime(syncData.currentTime)}</strong>
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 'bold',
              color: countdown <= 1 ? '#ff6b6b' : '#4CAF50'
            }}>
              {countdown}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '15px' }}>
              This video platform doesn't support automatic sync
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SyncFallbackPlayer.displayName = 'SyncFallbackPlayer';

export default SyncFallbackPlayer;