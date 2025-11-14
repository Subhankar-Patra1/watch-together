import React, { useState, useEffect, useCallback } from 'react';
import './ScreenShare.css';

const ScreenShare = ({ socket, roomCode, username, onScreenShare, forceStop }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [sharedStream, setSharedStream] = useState(null);

  const handleStopScreenShare = useCallback(() => {
    if (sharedStream) {
      // Stop all tracks
      sharedStream.getTracks().forEach(track => track.stop());
      setSharedStream(null);
    }

    setIsSharing(false);

    // Clear the main video area locally
    if (onScreenShare) {
      onScreenShare(null);
    }

    // Notify server that screen sharing stopped (server will broadcast to all)
    socket.emit('screen-share-stopped', {
      roomCode,
      username,
      socketId: socket.id
    });

    console.log('🛑 Screen sharing stopped');
  }, [sharedStream, onScreenShare, socket, roomCode, username]);

  useEffect(() => {
    // Handle force stop from parent component
    if (forceStop && isSharing) {
      handleStopScreenShare();
    }
  }, [forceStop, isSharing, handleStopScreenShare]);

  useEffect(() => {
    // Simple socket listeners for screen sharing events
    socket.on('screen-share-started', (data) => {
      console.log('🎬 Screen share started by:', data.username);
      // If it's not our own screen share, show the remote screen share
      if (data.username !== username) {
        console.log('🖥️ Showing remote screen share from:', data.username);
        if (onScreenShare) {
          onScreenShare({
            type: 'screen-share',
            stream: data.stream, // This will be handled by the server
            username: data.username,
            isRemote: true,
            socketId: data.socketId
          });
        }
      }
    });

    socket.on('screen-share-stopped', (data) => {
      console.log('🛑 Screen share stopped by:', data.username);
      // Clear the screen share if it was from this user
      if (onScreenShare) {
        onScreenShare(null);
      }
    });

    return () => {
      socket.off('screen-share-started');
      socket.off('screen-share-stopped');
    };
  }, [socket, username, onScreenShare]);

  const handleStartScreenShare = async (stream) => {
    try {
      setSharedStream(stream);
      setIsSharing(true);

      // Set the screen share as the main video using the callback
      const screenShareData = {
        type: 'screen-share',
        stream: stream,
        username: username
      };
      
      // Add a small delay to allow any existing video player to cleanup properly
      setTimeout(() => {
        if (onScreenShare) {
          onScreenShare(screenShareData);
        }
      }, 50);

      // Notify server about screen sharing (server will handle distribution)
      console.log('📡 Emitting screen-share-started to server:', {
        roomCode,
        username,
        socketId: socket.id
      });
      
      socket.emit('screen-share-started', {
        roomCode,
        username,
        socketId: socket.id
        // Note: Don't send stream object to server (not serializable)
      });

      // Handle stream end (when user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        handleStopScreenShare();
      });

      console.log('Screen sharing started successfully');
    } catch (error) {
      console.error('Error starting screen share:', error);
      setIsSharing(false);
      setSharedStream(null);
    }
  };

  const startScreenShare = async () => {
    // Directly trigger browser's native screen sharing dialog
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2
        }
      });
      
      if (stream) {
        // Process audio tracks to prevent feedback and improve quality
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
          // Apply audio constraints to reduce feedback and improve quality
          track.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            volume: 0.8 // Reduce volume to prevent distortion
          }).catch(err => {
            console.warn('Could not apply audio constraints:', err);
          });
        });
        
        handleStartScreenShare(stream);
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
      // If user cancels or denies permission, don't show any error
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
        alert('Failed to start screen sharing. Please try again.');
      }
    }
  };

  return (
    <div className="screen-share-container">
      {!isSharing ? (
        <button className="share-screen-btn" onClick={startScreenShare}>
          <span className="btn-icon">🖥️</span>
          Share Screen
        </button>
      ) : (
        <button className="stop-share-btn-inline" onClick={handleStopScreenShare}>
          <span className="btn-icon">🛑</span>
          Stop Sharing
        </button>
      )}
    </div>
  );
};

export default ScreenShare;