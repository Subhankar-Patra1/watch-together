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

  // WebRTC state for receiving screen shares
  const [peerConnection, setPeerConnection] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Create WebRTC connection for receiving screen shares
  const createReceiverConnection = useCallback(async (sharerSocketId) => {
    console.log('🔗 Creating WebRTC connection to receive screen share from:', sharerSocketId);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log('🎥 Received screen share stream!');
      const stream = event.streams[0];
      setRemoteStream(stream);
      
      // Show the actual screen share stream
      if (onScreenShare) {
        onScreenShare({
          type: 'screen-share',
          stream: stream,
          username: 'Remote Screen Share',
          isRemote: true
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          roomCode,
          to: sharerSocketId,
          from: socket.id,
          candidate: event.candidate
        });
      }
    };

    setPeerConnection(pc);
    return pc;
  }, [socket, roomCode, onScreenShare]);

  // Create WebRTC connection for sending screen shares
  const createSenderConnection = useCallback(async (receiverSocketId, stream) => {
    console.log('📤 Creating WebRTC connection to send screen share to:', receiverSocketId);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add screen share stream to connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          roomCode,
          to: receiverSocketId,
          from: socket.id,
          candidate: event.candidate
        });
      }
    };

    return pc;
  }, [socket, roomCode]);

  useEffect(() => {
    // WebRTC signaling for screen sharing
    socket.on('screen-share-started', async (data) => {
      console.log('🎬 Screen share started by:', data.username);
      
      if (data.username !== username) {
        console.log('📡 Requesting WebRTC connection for screen share');
        // Request WebRTC connection to receive screen share
        socket.emit('request-screen-share-webrtc', {
          roomCode,
          to: data.socketId,
          from: socket.id
        });
      }
    });

    socket.on('request-screen-share-webrtc', async (data) => {
      console.log('📞 WebRTC screen share requested by:', data.from);
      
      if (isSharing && sharedStream) {
        try {
          const pc = await createSenderConnection(data.from, sharedStream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit('webrtc-offer', {
            roomCode,
            to: data.from,
            from: socket.id,
            offer: offer
          });
        } catch (error) {
          console.error('❌ Error creating WebRTC offer:', error);
        }
      }
    });

    socket.on('webrtc-offer', async (data) => {
      console.log('📥 Received WebRTC offer from:', data.from);
      
      try {
        const pc = await createReceiverConnection(data.from);
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('webrtc-answer', {
          roomCode,
          to: data.from,
          from: socket.id,
          answer: answer
        });
      } catch (error) {
        console.error('❌ Error handling WebRTC offer:', error);
      }
    });

    socket.on('webrtc-answer', async (data) => {
      console.log('📨 Received WebRTC answer from:', data.from);
      
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(data.answer);
        } catch (error) {
          console.error('❌ Error handling WebRTC answer:', error);
        }
      }
    });

    socket.on('webrtc-ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate from:', data.from);
      
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(data.candidate);
        } catch (error) {
          console.error('❌ Error handling ICE candidate:', error);
        }
      }
    });

    socket.on('screen-share-stopped', (data) => {
      console.log('🛑 Screen share stopped by:', data.username);
      
      // Clean up WebRTC connection
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }
      
      setRemoteStream(null);
      
      if (onScreenShare) {
        onScreenShare(null);
      }
    });

    return () => {
      socket.off('screen-share-started');
      socket.off('request-screen-share-webrtc');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('screen-share-stopped');
    };
  }, [socket, username, onScreenShare, isSharing, sharedStream, createReceiverConnection, createSenderConnection, peerConnection]);

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