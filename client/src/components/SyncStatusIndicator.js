import React from 'react';
import { detectVideoType } from './UniversalPlayer';

const SyncStatusIndicator = ({ videoData }) => {
  if (!videoData || !videoData.url) {
    return null;
  }

  const videoType = detectVideoType(videoData);
  
  const getSyncStatus = (type) => {
    switch (type) {
      case 'youtube':
        return { 
          supported: true, 
          icon: '🎯', 
          text: 'Full Sync Supported',
          color: '#4CAF50'
        };
      case 'vimeo':
        return { 
          supported: true, 
          icon: '🎯', 
          text: 'Full Sync Supported',
          color: '#4CAF50'
        };
      case 'dailymotion':
        return { 
          supported: true, 
          icon: '🎯', 
          text: 'Full Sync Supported',
          color: '#4CAF50'
        };
      case 'direct':
      case 'hls':
      case 'dash':
        return { 
          supported: true, 
          icon: '🎯', 
          text: 'Basic Sync Supported',
          color: '#FF9800'
        };
      case 'twitter':
      case 'twitch':
      case 'facebook':
      case 'instagram':
      case 'tiktok':
      case 'embed':
        return { 
          supported: false, 
          icon: '⚠️', 
          text: 'Sync Not Available',
          color: '#f44336'
        };
      case 'screen-share':
        return { 
          supported: false, 
          icon: '📺', 
          text: 'Live Stream',
          color: '#2196F3'
        };
      default:
        return { 
          supported: false, 
          icon: '❓', 
          text: 'Sync Unknown',
          color: '#9E9E9E'
        };
    }
  };

  const status = getSyncStatus(videoType);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: '12px',
      backgroundColor: status.supported ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
      border: `1px solid ${status.color}`,
      fontSize: '12px',
      fontWeight: '500',
      color: status.color,
      margin: '0 8px'
    }}>
      <span style={{ marginRight: '4px' }}>{status.icon}</span>
      <span>{status.text}</span>
    </div>
  );
};

export default SyncStatusIndicator;