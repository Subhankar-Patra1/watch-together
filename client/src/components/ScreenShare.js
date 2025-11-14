import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ScreenShare.css';

const ScreenShare = ({
  socket,
  roomCode,
  username,
  onScreenShare,
  forceStop = false,
  canShare = true,
  showControls = true,
  activeShareUsername = null
}) => {
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

    // Close all outgoing WebRTC connections
    senderConnectionsRef.current.forEach((pc, receiverId) => {
      try {
        pc.close();
        console.log('🔚 Closed sender connection for', receiverId);
      } catch (err) {
        console.warn('Error closing sender connection:', err);
      }
    });
    senderConnectionsRef.current.clear();

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

  // WebRTC state for receiving/sending screen shares
  const [remoteStream, setRemoteStream] = useState(null);
  const receiverConnectionsRef = useRef(new Map());
  const senderConnectionsRef = useRef(new Map());
  const sharerNamesRef = useRef(new Map());

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
        const nameFromMap = sharerNamesRef.current.get(sharerSocketId);
        const displayName = nameFromMap || activeShareUsername || 'Screen Share';
        onScreenShare({
          type: 'screen-share',
          stream: stream,
          username: displayName,
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

    receiverConnectionsRef.current.set(sharerSocketId, pc);
    return pc;
  }, [socket, roomCode, onScreenShare, activeShareUsername]);

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

    senderConnectionsRef.current.set(receiverSocketId, pc);
    return pc;
  }, [socket, roomCode]);

  useEffect(() => {
    // WebRTC signaling for screen sharing
    socket.on('screen-share-started', async (data) => {
      console.log('🎬 Screen share started by:', data.username, 'socketId:', data.socketId);
      // Cache sharer name for display when the track arrives
      if (data.socketId && data.username) {
        sharerNamesRef.current.set(data.socketId, data.username);
      }
      
      if (data.username !== username) {
        console.log('📡 Requesting WebRTC connection for screen share from:', data.socketId);
        // Request WebRTC connection to receive screen share
        socket.emit('request-screen-share-webrtc', {
          roomCode,
          to: data.socketId,
          from: socket.id
        });
        console.log('📡 Sent WebRTC request to:', data.socketId);
      } else {
        console.log('🎬 Ignoring own screen share event');
      }
    });

    socket.on('request-screen-share-webrtc', async (data) => {
      console.log('📞 WebRTC screen share requested by:', data.from);
      console.log('📞 Current sharing state - isSharing:', isSharing, 'hasStream:', !!sharedStream);
      
      if (isSharing && sharedStream) {
        console.log('📤 Creating WebRTC offer for:', data.from);
        try {
          const pc = await createSenderConnection(data.from, sharedStream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          console.log('📤 Sending WebRTC offer to:', data.from);
          socket.emit('webrtc-offer', {
            roomCode,
            to: data.from,
            from: socket.id,
            offer: offer
          });
        } catch (error) {
          console.error('❌ Error creating WebRTC offer:', error);
        }
      } else {
        console.log('⚠️ Cannot create offer - not sharing or no stream');
      }
    });

    socket.on('webrtc-offer', async (data) => {
      console.log('📥 Received WebRTC offer from:', data.from);
      
      try {
        console.log('📥 Creating receiver connection for:', data.from);
        const pc = await createReceiverConnection(data.from);
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log('📨 Sending WebRTC answer to:', data.from);
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

      const senderConnection = senderConnectionsRef.current.get(data.from);
      const receiverConnection = receiverConnectionsRef.current.get(data.from);

      try {
        if (senderConnection) {
          await senderConnection.setRemoteDescription(data.answer);
        } else if (receiverConnection) {
          await receiverConnection.setRemoteDescription(data.answer);
        } else {
          console.warn('No matching peer connection found for answer from:', data.from);
        }
      } catch (error) {
        console.error('❌ Error handling WebRTC answer:', error);
      }
    });

    socket.on('webrtc-ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate from:', data.from);

      const senderConnection = senderConnectionsRef.current.get(data.from);
      const receiverConnection = receiverConnectionsRef.current.get(data.from);

      try {
        if (senderConnection) {
          await senderConnection.addIceCandidate(data.candidate);
        } else if (receiverConnection) {
          await receiverConnection.addIceCandidate(data.candidate);
        } else {
          console.warn('No matching peer connection found for ICE candidate from:', data.from);
        }
      } catch (error) {
        console.error('❌ Error handling ICE candidate:', error);
      }
    });

    socket.on('screen-share-stopped', (data) => {
      console.log('🛑 Screen share stopped by:', data.username);
      // Clear cached name
      if (data.socketId) {
        sharerNamesRef.current.delete(data.socketId);
      }

      receiverConnectionsRef.current.forEach((pc, sharerId) => {
        try {
          pc.close();
          console.log('🔚 Closed receiver connection from', sharerId);
        } catch (err) {
          console.warn('Error closing receiver connection:', err);
        }
      });
      receiverConnectionsRef.current.clear();

      senderConnectionsRef.current.forEach((pc, receiverId) => {
        try {
          pc.close();
          console.log('🔚 Closed sender connection for', receiverId);
        } catch (err) {
          console.warn('Error closing sender connection:', err);
        }
      });
      senderConnectionsRef.current.clear();

      setRemoteStream(null);

      if (onScreenShare) {
        onScreenShare(null);
      }
    });

    return () => {
      receiverConnectionsRef.current.forEach((pc) => pc.close());
      receiverConnectionsRef.current.clear();
      senderConnectionsRef.current.forEach((pc) => pc.close());
      senderConnectionsRef.current.clear();

      socket.off('screen-share-started');
      socket.off('request-screen-share-webrtc');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('screen-share-stopped');
    };
  }, [socket, username, onScreenShare, isSharing, sharedStream, createReceiverConnection, createSenderConnection]);

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
    if (!canShare) {
      return;
    }
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

  if (!showControls) {
    return null;
  }

  return (
    <div className="screen-share-container">
      {!isSharing ? (
        <button className="share-screen-btn" onClick={startScreenShare} disabled={!canShare}>
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