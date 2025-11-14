import React, { useState, useEffect, useCallback } from 'react';
import './ScreenShare.css';

const ScreenShare = ({ socket, roomCode, username, onScreenShare, forceStop }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [sharedStream, setSharedStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState(new Map());
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  const handleStopScreenShare = useCallback(() => {
    if (sharedStream) {
      // Stop all tracks
      sharedStream.getTracks().forEach(track => track.stop());
      setSharedStream(null);
    }

    // Close all peer connections
    peerConnections.forEach(pc => {
      pc.close();
    });
    setPeerConnections(new Map());
    setRemoteStreams(new Map());

    setIsSharing(false);

    // Clear the main video area
    if (onScreenShare) {
      onScreenShare(null);
    }

    // Notify other users that screen sharing stopped
    socket.emit('screen-share-stop', {
      roomCode,
      username
    });

    console.log('Screen sharing stopped');
  }, [sharedStream, onScreenShare, socket, roomCode, username, peerConnections]);

  useEffect(() => {
    // Handle force stop from parent component
    if (forceStop && isSharing) {
      handleStopScreenShare();
    }
  }, [forceStop, isSharing, handleStopScreenShare]);

  // Create peer connection for screen sharing
  const createPeerConnection = useCallback((targetSocketId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    if (sharedStream) {
      sharedStream.getTracks().forEach(track => {
        pc.addTrack(track, sharedStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('screen-share-ice-candidate', {
          roomCode,
          to: targetSocketId,
          from: socket.id,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream (for receiving screen shares)
    pc.ontrack = (event) => {
      console.log('🎥 Received remote screen share stream from:', targetSocketId);
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => new Map(prev.set(targetSocketId, remoteStream)));
      
      // Show the remote screen share in main video area
      if (onScreenShare) {
        console.log('🖥️ Displaying remote screen share in main video area');
        onScreenShare({
          type: 'screen-share',
          stream: remoteStream,
          username: 'Remote User'
        });
      }
    };

    // Add connection state logging
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Screen share connection state with ${targetSocketId}:`, pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 Screen share ICE connection state with ${targetSocketId}:`, pc.iceConnectionState);
    };

    return pc;
  }, [sharedStream, socket, roomCode, onScreenShare]);

  useEffect(() => {
    // Socket listeners for screen sharing
    socket.on('screen-share-started', (data) => {
      console.log('🎬 Screen share started by:', data.username, 'Socket ID:', data.socketId);
      // Don't create connection if it's our own screen share
      if (data.username !== username && data.socketId !== socket.id) {
        console.log('📡 Requesting screen share from:', data.username);
        // Request screen share from the user who started sharing
        socket.emit('request-screen-share', {
          roomCode,
          to: data.socketId,
          from: socket.id
        });
      }
    });

    socket.on('screen-share-stopped', (data) => {
      console.log('Screen share stopped by:', data.username);
      // Clean up peer connection for this user
      if (peerConnections.has(data.socketId)) {
        peerConnections.get(data.socketId).close();
        setPeerConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.socketId);
          return newMap;
        });
      }
      
      // Remove remote stream
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.socketId);
        return newMap;
      });

      // Clear main video if this was the active screen share
      if (onScreenShare) {
        onScreenShare(null);
      }
    });

    socket.on('request-screen-share', async (data) => {
      console.log('📞 Screen share requested by:', data.from);
      if (isSharing && sharedStream) {
        console.log('🎥 Creating offer for screen share to:', data.from);
        // Create peer connection and send offer
        const pc = createPeerConnection(data.from);
        setPeerConnections(prev => new Map(prev.set(data.from, pc)));

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          console.log('📤 Sending screen share offer to:', data.from);
          socket.emit('screen-share-offer', {
            roomCode,
            to: data.from,
            from: socket.id,
            offer: offer
          });
        } catch (error) {
          console.error('❌ Error creating screen share offer:', error);
        }
      } else {
        console.log('⚠️ Not sharing or no stream available');
      }
    });

    socket.on('screen-share-offer', async (data) => {
      console.log('Received screen share offer from:', data.from);
      try {
        const pc = createPeerConnection(data.from);
        setPeerConnections(prev => new Map(prev.set(data.from, pc)));

        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('screen-share-answer', {
          roomCode,
          to: data.from,
          from: socket.id,
          answer: answer
        });
      } catch (error) {
        console.error('Error handling screen share offer:', error);
      }
    });

    socket.on('screen-share-answer', async (data) => {
      console.log('Received screen share answer from:', data.from);
      try {
        const pc = peerConnections.get(data.from);
        if (pc) {
          await pc.setRemoteDescription(data.answer);
        }
      } catch (error) {
        console.error('Error handling screen share answer:', error);
      }
    });

    socket.on('screen-share-ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.from);
      try {
        const pc = peerConnections.get(data.from);
        if (pc) {
          await pc.addIceCandidate(data.candidate);
        }
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    });

    return () => {
      socket.off('screen-share-started');
      socket.off('screen-share-stopped');
      socket.off('request-screen-share');
      socket.off('screen-share-offer');
      socket.off('screen-share-answer');
      socket.off('screen-share-ice-candidate');
    };
  }, [socket, username, isSharing, sharedStream, createPeerConnection, peerConnections, onScreenShare]);

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

      // Notify other users that screen sharing started
      socket.emit('screen-share-start', {
        roomCode,
        username,
        socketId: socket.id
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