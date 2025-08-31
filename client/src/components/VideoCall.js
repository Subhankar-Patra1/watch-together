import React, { useState, useEffect, useRef, useCallback } from "react";
import Peer from "simple-peer";

const VideoCall = ({
  socket,
  users,
  currentUsername,
  isCallActive,
  onToggleCall,
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isStreamStable, setIsStreamStable] = useState(false);
  const [isLocalVideoFlipped, setIsLocalVideoFlipped] = useState(false);

  const localVideoRef = useRef(null);
  const peersRef = useRef({});

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      console.log("Initializing media stream...");

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support video calling");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      console.log("Media stream obtained:", stream);
      console.log("Stream active:", stream.active);
      console.log(
        "Video tracks active:",
        stream.getVideoTracks().map((t) => t.enabled)
      );
      setLocalStream(stream);

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      let errorMessage = "Failed to access camera/microphone. ";

      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera and microphone permissions.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera or microphone found.";
      } else if (error.name === "NotSupportedError") {
        errorMessage += "Your browser does not support video calling.";
      } else {
        errorMessage += "Please check your camera and microphone.";
      }

      throw new Error(errorMessage);
    }
  }, []);

  // Create peer connection
  const createPeer = useCallback(
    (userToSignal, callerID, stream) => {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
          sdpSemantics: "unified-plan",
        },
      });

      peer.on("signal", (signal) => {
        socket.emit("sending-signal", { userToSignal, callerID, signal });
      });

      peer.on("stream", (remoteStream) => {
        setPeers((prev) => ({
          ...prev,
          [userToSignal]: { ...prev[userToSignal], stream: remoteStream },
        }));
      });

      // Optimize video quality after connection
      peer.on("connect", () => {
        try {
          const sender = peer._pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender && sender.getParameters) {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps
              params.encodings[0].maxFramerate = 30;
              sender.setParameters(params);
            }
          }
        } catch (error) {
          console.log("Could not optimize video quality:", error);
        }
      });

      return peer;
    },
    [socket]
  );

  // Add peer connection
  const addPeer = useCallback(
    (incomingSignal, callerID, stream) => {
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
          sdpSemantics: "unified-plan",
        },
      });

      peer.on("signal", (signal) => {
        socket.emit("returning-signal", { signal, callerID });
      });

      peer.on("stream", (remoteStream) => {
        setPeers((prev) => ({
          ...prev,
          [callerID]: { ...prev[callerID], stream: remoteStream },
        }));
      });

      // Optimize video quality after connection
      peer.on("connect", () => {
        try {
          const sender = peer._pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender && sender.getParameters) {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps
              params.encodings[0].maxFramerate = 30;
              sender.setParameters(params);
            }
          }
        } catch (error) {
          console.log("Could not optimize video quality:", error);
        }
      });

      peer.signal(incomingSignal);
      return peer;
    },
    [socket]
  );

  // Start video call
  const startCall = useCallback(async () => {
    try {
      console.log("Starting video call - current localStream:", !!localStream);

      // Don't start if we already have a stream
      if (localStream) {
        console.log("Local stream already exists, skipping initialization");
        return;
      }

      setIsInitializing(true);
      setInitError(null);

      const stream = await initializeMedia();
      console.log(
        "✅ Media initialized, stream tracks:",
        stream.getTracks().length
      );
      console.log("Video tracks:", stream.getVideoTracks().length);
      console.log("Audio tracks:", stream.getAudioTracks().length);

      // Create peer connections for all other users
      const otherUsers = users.filter(
        (user) => user.username !== currentUsername
      );

      console.log("Creating peer connections for users:", otherUsers.length);

      otherUsers.forEach((user) => {
        const peer = createPeer(user.id, socket.id, stream);
        peersRef.current[user.id] = peer;
        setPeers((prev) => ({
          ...prev,
          [user.id]: {
            peer,
            stream: null,
            username: user.username,
            color: user.color,
          },
        }));
      });

      // Notify server that user joined the call (only if not already in participants)
      // This happens for both new calls and joining existing calls
      console.log("📞 About to emit join-video-call");
      socket.emit("join-video-call");
      console.log("✅ Video call started successfully");
      setIsInitializing(false);

      // Mark stream as stable after a short delay
      setTimeout(() => {
        setIsStreamStable(true);
      }, 2000);
    } catch (error) {
      console.error("Failed to start call:", error);
      setInitError(error.message);
      setIsInitializing(false);
      // Don't show alert, just display error in UI
    }
  }, [
    users,
    currentUsername,
    socket,
    initializeMedia,
    createPeer,
    localStream,
  ]);

  // End video call
  const endCall = useCallback(() => {
    console.log("🛑 endCall called - localStream exists:", !!localStream);

    // Stop local stream
    if (localStream) {
      console.log("🛑 Stopping local stream tracks...");
      localStream.getTracks().forEach((track) => {
        console.log("Stopping track:", track.kind, track.id);
        track.stop();
      });
      setLocalStream(null);
      setIsStreamStable(false);
    }

    // Close all peer connections
    Object.values(peersRef.current).forEach((peer) => {
      if (peer && peer.destroy) {
        peer.destroy();
      }
    });

    peersRef.current = {};
    setPeers({});

    // Notify server
    socket.emit("leave-video-call");
    console.log("🛑 Video call ended");
  }, [localStream, socket]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: true,
        });

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach((peer) => {
          if (peer && peer.replaceTrack) {
            const sender = peer._pc
              .getSenders()
              .find((s) => s.track && s.track.kind === "video");
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          }
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        // Handle screen share end
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          initializeMedia().then((cameraStream) => {
            const cameraVideoTrack = cameraStream.getVideoTracks()[0];
            Object.values(peersRef.current).forEach((peer) => {
              if (peer && peer.replaceTrack) {
                const sender = peer._pc
                  .getSenders()
                  .find((s) => s.track && s.track.kind === "video");
                if (sender) {
                  sender.replaceTrack(cameraVideoTrack);
                }
              }
            });
          });
        };
      }
    } catch (error) {
      console.error("Screen sharing failed:", error);
    }
  }, [isScreenSharing, initializeMedia]);

  // Socket event listeners
  useEffect(() => {
    socket.on("user-joined-call", ({ userId }) => {
      if (localStream && userId !== socket.id) {
        const peer = createPeer(userId, socket.id, localStream);
        peersRef.current[userId] = peer;

        const user = users.find((u) => u.id === userId);
        setPeers((prev) => ({
          ...prev,
          [userId]: {
            peer,
            stream: null,
            username: user?.username,
            color: user?.color,
          },
        }));
      }
    });

    socket.on("existing-call-participants", ({ participants }) => {
      console.log("📞 Received existing call participants:", participants);
      if (localStream) {
        participants.forEach((user) => {
          if (user.id !== socket.id) {
            const peer = createPeer(user.id, socket.id, localStream);
            peersRef.current[user.id] = peer;

            setPeers((prev) => ({
              ...prev,
              [user.id]: {
                peer,
                stream: null,
                username: user.username,
                color: user.color,
              },
            }));
          }
        });
      }
    });

    socket.on("receiving-returned-signal", ({ signal, id }) => {
      if (peersRef.current[id]) {
        peersRef.current[id].signal(signal);
      }
    });

    socket.on("user-sending-signal", ({ signal, callerID }) => {
      if (localStream) {
        const peer = addPeer(signal, callerID, localStream);
        peersRef.current[callerID] = peer;

        const user = users.find((u) => u.id === callerID);
        setPeers((prev) => ({
          ...prev,
          [callerID]: {
            peer,
            stream: null,
            username: user?.username,
            color: user?.color,
          },
        }));
      }
    });

    socket.on("user-left-call", ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
        setPeers((prev) => {
          const newPeers = { ...prev };
          delete newPeers[userId];
          return newPeers;
        });
      }
    });

    return () => {
      socket.off("user-joined-call");
      socket.off("existing-call-participants");
      socket.off("receiving-returned-signal");
      socket.off("user-sending-signal");
      socket.off("user-left-call");
    };
  }, [socket, localStream, users, createPeer, addPeer]);

  // Handle local video stream assignment
  useEffect(() => {
    console.log(
      "Local stream useEffect triggered:",
      !!localStream,
      !!localVideoRef.current
    );

    if (localStream && localVideoRef.current) {
      console.log("Setting local video stream");
      localVideoRef.current.srcObject = localStream;

      const videoElement = localVideoRef.current;

      const handleLoadedMetadata = () => {
        console.log("Local video metadata loaded - attempting play");
        videoElement.play().catch((error) => {
          console.error("Error playing local video:", error);
        });
      };

      const handleCanPlay = () => {
        console.log("Video can play - ensuring it plays");
        videoElement.play().catch((error) => {
          console.error("Error playing video on canplay:", error);
        });
      };

      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.addEventListener("canplay", handleCanPlay);

      // Force play after a short delay
      setTimeout(() => {
        if (videoElement.srcObject) {
          videoElement.play().catch(console.error);
        }
      }, 100);

      return () => {
        videoElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
        videoElement.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [localStream]);

  useEffect(() => {
    if (localVideoRef.current && !isLocalVideoFlipped) {
      localVideoRef.current.style.transform = "scaleX(-1)";
      setIsLocalVideoFlipped(true);
    }
  }, [isLocalVideoFlipped]);

  // Auto-start call when component mounts and call is active
  useEffect(() => {
    console.log(
      "🔄 VideoCall useEffect - isCallActive:",
      isCallActive,
      "localStream:",
      !!localStream,
      "isInitializing:",
      isInitializing
    );

    let timeoutId;

    if (isCallActive && !localStream && !isInitializing) {
      console.log("🎬 Starting call...");
      // Add a small delay to ensure component is fully mounted
      timeoutId = setTimeout(() => {
        startCall();
      }, 200);
    } else if (
      !isCallActive &&
      localStream &&
      !isInitializing &&
      isStreamStable
    ) {
      console.log(
        "🛑 Call inactive but stream exists - checking if we should end..."
      );
      // Add a delay before ending to prevent premature termination
      timeoutId = setTimeout(() => {
        if (!isCallActive && localStream && isStreamStable) {
          console.log("🛑 Ending call after delay...");
          endCall();
        }
      }, 1000); // Wait 1 second before ending
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isCallActive,
    localStream,
    startCall,
    endCall,
    isInitializing,
    isStreamStable,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  if (!isCallActive) {
    console.log("VideoCall not rendering - isCallActive is false");
    return null;
  }

  console.log(
    "VideoCall rendering - localStream:",
    !!localStream,
    "peers count:",
    Object.keys(peers).length,
    "isInitializing:",
    isInitializing,
    "initError:",
    !!initError
  );

  return (
    <div className="video-call-container">
      <div className="video-grid">
        {/* Local video */}
        <div className="video-item local-video" key="local-video-container">
          {isInitializing ? (
            <div className="video-loading">
              <div className="loading-spinner"></div>
              <p>Initializing camera...</p>
            </div>
          ) : initError ? (
            <div className="video-error">
              <div className="error-icon">📹❌</div>
              <p>Camera Error</p>
              <span className="error-message">{initError}</span>
              <button
                className="retry-btn"
                onClick={() => {
                  setInitError(null);
                  startCall();
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <video
                ref={localVideoRef}
                key="local-video-element"
                autoPlay
                muted
                playsInline
                controls={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "8px",
                  background: "#1a1a1a",
                  display: "block",
                }}
                className={`video-element ${
                  !isVideoEnabled ? "video-disabled" : ""
                }`}
                onLoadedMetadata={(e) => {
                  console.log("Local video metadata loaded");
                  e.target.play().catch(console.error);
                }}
                onError={(e) => {
                  console.error("Local video error:", e);
                }}
                onPlay={() => {
                  console.log("Video started playing");
                }}
                onPause={() => {
                  console.log("Video paused");
                }}
              />
              {!localStream && (
                <div className="video-placeholder">
                  <div className="placeholder-icon">📹</div>
                  <p>Camera Starting...</p>
                </div>
              )}
            </>
          )}
          <div className="video-overlay">
            <span className="video-username" style={{ color: "#4ECDC4" }}>
              {currentUsername} (You)
            </span>
            {!isVideoEnabled && <span className="video-status">📷 Off</span>}
            {!isAudioEnabled && <span className="video-status">🎤 Muted</span>}
          </div>
        </div>

        {/* Remote videos */}
        {Object.entries(peers).map(([peerId, peerData]) => (
          <RemoteVideo
            key={peerId}
            stream={peerData.stream}
            username={peerData.username}
            color={peerData.color}
          />
        ))}
      </div>

      <div className="video-controls">
        <button
          className={`control-btn ${isVideoEnabled ? "active" : "inactive"}`}
          onClick={toggleVideo}
          title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoEnabled ? "📹" : "📷"}
        </button>

        <button
          className={`control-btn ${isAudioEnabled ? "active" : "inactive"}`}
          onClick={toggleAudio}
          title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isAudioEnabled ? "🎤" : "🔇"}
        </button>

        <button
          className={`control-btn ${isScreenSharing ? "active" : ""}`}
          onClick={toggleScreenShare}
          title={isScreenSharing ? "Stop screen sharing" : "Share screen"}
        >
          🖥️
        </button>
      </div>
    </div>
  );
};

const RemoteVideo = ({ stream, username, color }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-item remote-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "8px",
          background: "#1a1a1a",
        }}
        className="video-element"
      />
      <div className="video-overlay">
        <span className="video-username" style={{ color: color || "#a0aec0" }}>
          {username}
        </span>
      </div>
    </div>
  );
};

export default VideoCall;