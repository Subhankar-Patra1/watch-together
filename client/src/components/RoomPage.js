import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import UniversalPlayer, {
  detectVideoType,
  extractYouTubeVideoId,
} from "./UniversalPlayer";
import VideoCallSection from "./VideoCallSection";
import GroupChatSection from "./GroupChatSection";
import ResizablePanel from "./ResizablePanel";
import ScreenShare from "./ScreenShare";

const RoomPage = ({
  socket,
  roomCode,
  username,
  isHost: initialIsHost,
  initialRoomData,
  onLeaveRoom,
}) => {
  const [users, setUsers] = useState(initialRoomData?.users || []);
  const [messages, setMessages] = useState(initialRoomData?.messages || []);
  const [video, setVideo] = useState(initialRoomData?.video || null);
  const [isHost, setIsHost] = useState(initialIsHost || false);
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [copySuccess, setCopySuccess] = useState("");
  const [showHostTransferPopup, setShowHostTransferPopup] = useState(false);
  const [selectedNewHost, setSelectedNewHost] = useState("");
  const [activeRightSection, setActiveRightSection] = useState("chat"); // 'chat' or 'video'
  const [showScreenSharePopup, setShowScreenSharePopup] = useState(false);
  const [pendingVideoData, setPendingVideoData] = useState(null);
  const [forceStopScreenShare, setForceStopScreenShare] = useState(false);
  const playerRef = useRef(null);

  // Sync initial host status from prop
  useEffect(() => {
    console.log("🔍 RoomPage: Initial host status prop:", initialIsHost);
    if (initialIsHost !== undefined) {
      setIsHost(initialIsHost);
      console.log("🔍 RoomPage: Set isHost to:", initialIsHost);
    }
  }, [initialIsHost]);

  // Global screen sharing WebRTC state
  const [globalPeerConnections, setGlobalPeerConnections] = useState(new Map());

  useEffect(() => {
    // Global screen sharing WebRTC listeners (independent of ScreenShare component)
    const handleGlobalScreenShareOffer = async (data) => {
      console.log('🌐 Global: Received screen share offer from:', data.from);
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        // Handle remote stream
        pc.ontrack = (event) => {
          console.log('🌐 Global: Received remote screen share stream');
          const remoteStream = event.streams[0];
          
          // Show the remote screen share in main video area
          setVideo({
            type: 'screen-share',
            stream: remoteStream,
            username: data.username || 'Remote User',
            isRemote: true
          });
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('screen-share-ice-candidate', {
              roomCode,
              to: data.from,
              from: socket.id,
              candidate: event.candidate
            });
          }
        };

        setGlobalPeerConnections(prev => new Map(prev.set(data.from, pc)));

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
        console.error('🌐 Global: Error handling screen share offer:', error);
      }
    };

    const handleGlobalScreenShareAnswer = async (data) => {
      console.log('🌐 Global: Received screen share answer from:', data.from);
      try {
        const pc = globalPeerConnections.get(data.from);
        if (pc) {
          await pc.setRemoteDescription(data.answer);
        }
      } catch (error) {
        console.error('🌐 Global: Error handling screen share answer:', error);
      }
    };

    const handleGlobalScreenShareIceCandidate = async (data) => {
      console.log('🌐 Global: Received ICE candidate from:', data.from);
      try {
        const pc = globalPeerConnections.get(data.from);
        if (pc) {
          await pc.addIceCandidate(data.candidate);
        }
      } catch (error) {
        console.error('🌐 Global: Error handling ICE candidate:', error);
      }
    };

    // Add global listeners
    socket.on('screen-share-offer', handleGlobalScreenShareOffer);
    socket.on('screen-share-answer', handleGlobalScreenShareAnswer);
    socket.on('screen-share-ice-candidate', handleGlobalScreenShareIceCandidate);

    // Socket event listeners
    socket.on("room-joined", (data) => {
      setUsers(data.users);
      setMessages(data.messages);
      setVideo(data.video);
      setIsHost(data.isHost);
      setError("");

      // If a screen share is already active when we join, proactively request the WebRTC stream
      try {
        if (data.video && data.video.type === 'screen-share' && data.video.socketId && data.video.socketId !== socket.id) {
          console.log('🖥️ Detected active screen share on join. Requesting WebRTC from:', data.video.socketId);
          socket.emit('request-screen-share-webrtc', {
            roomCode,
            to: data.video.socketId,
            from: socket.id
          });
        }
      } catch (err) {
        console.warn('⚠️ Error requesting screen share on join:', err);
      }
    });

    socket.on("initial-video-sync", (data) => {
      // Handle initial video sync for new users joining a room with existing video
      if (playerRef.current) {
        playerRef.current.syncVideo(data);
      }
    });

    socket.on("users-updated", (data) => {
      setUsers(data.users);
    });

    socket.on("user-joined", (data) => {
      // Add system message for user joined
      const systemMessage = {
        id: `system-${Date.now()}-${Math.random()}`,
        type: "system",
        message: `${data.user.username} joined the room`,
        timestamp: new Date().toISOString(),
        icon: "👋",
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    socket.on("user-left", (data) => {
      // Add system message for user left
      const systemMessage = {
        id: `system-${Date.now()}-${Math.random()}`,
        type: "system",
        message: `${data.username} left the room`,
        timestamp: new Date().toISOString(),
        icon: "👋",
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    socket.on("video-set", (data) => {
      console.log("📺 Received video-set:", data.video);
      setVideo(data.video);
    });

    socket.on("video-sync", (data) => {
      console.log("📡 Received video-sync:", data);
      
      // Don't sync if we're in screen sharing mode
      if (video && video.type === 'screen-share') {
        console.log("📡 Ignoring video-sync during screen sharing");
        return;
      }
      
      if (playerRef.current) {
        console.log("📡 Calling syncVideo on player");
        playerRef.current.syncVideo(data);

        // Add a system message about the sync from host
        if (data.syncedBy && data.syncedBy !== username) {
          const systemMessage = {
            id: `system-sync-${Date.now()}-${Math.random()}`,
            type: "system",
            message: `� Host ${data.syncedBy} synced everyone to the same position`,
            timestamp: new Date().toISOString(),
            icon: "🔄",
          };
          setMessages((prev) => [...prev, systemMessage]);
        }
      } else {
        console.log("📡 No player ref available");
      }
    });

    socket.on("sync-success", (data) => {
      console.log("✅ Sync success:", data);
    });

    socket.on("sync-error", (data) => {
      console.error("❌ Sync error:", data);
    });

    socket.on("test-event", (data) => {
      console.log("🧪 Received test-event:", data);
    });

    socket.on("new-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("user-typing", (data) => {
      setTypingUsers((prev) => {
        const filtered = prev.filter((user) => user !== data.username);
        return data.isTyping ? [...filtered, data.username] : filtered;
      });
    });

    socket.on("host-status", (data) => {
      setIsHost(data.isHost);

      // Add system message when user becomes host
      if (data.isHost) {
        const systemMessage = {
          id: `system-${Date.now()}-${Math.random()}`,
          type: "system",
          message: `👑 You are now the host - You can control the video and room settings`,
          timestamp: new Date().toISOString(),
          icon: "👑",
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    });

    socket.on("error", (data) => {
      setError(data.message);
      setTimeout(() => setError(""), 5000);
    });

    // Screen sharing room state events
    socket.on("room-screen-share-started", (data) => {
      console.log('🖥️ Room screen share started by:', data.username);
      console.log('🖥️ Current username:', username);
      console.log('🖥️ Current video state:', video);
      
      // Always set screen share state (the server should handle this via video-set)
      console.log('🖥️ Screen share should be handled by video-set event from server');
    });

    socket.on("room-screen-share-stopped", (data) => {
      console.log('🖥️ Room screen share stopped by:', data.username);
      
      // Clean up peer connection for this user
      const pc = globalPeerConnections.get(data.socketId);
      if (pc) {
        pc.close();
        setGlobalPeerConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.socketId);
          return newMap;
        });
      }
      
      // Screen share stop should be handled by video-set event from server
      console.log('🖥️ Screen share stop should be handled by video-set event from server');
    });

    return () => {
      // Clean up global peer connections
      globalPeerConnections.forEach(pc => pc.close());
      setGlobalPeerConnections(new Map());

      socket.off("room-joined");
      socket.off("initial-video-sync");
      socket.off("users-updated");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("video-set");
      socket.off("video-sync");
      socket.off("sync-success");
      socket.off("sync-error");
      socket.off("test-event");
      socket.off("new-message");
      socket.off("user-typing");
      socket.off("host-status");
      socket.off("error");
      socket.off("room-screen-share-started");
      socket.off("room-screen-share-stopped");
      socket.off("screen-share-offer");
      socket.off("screen-share-answer");
      socket.off("screen-share-ice-candidate");
    };
  }, [socket, roomCode, globalPeerConnections]);

  const handleVideoAction = useCallback(
    (action, currentTime) => {
      socket.emit("video-action", { action, currentTime });
    },
    [socket]
  );

  const handleSendMessage = useCallback(
    (message) => {
      socket.emit("send-message", { message });
    },
    [socket]
  );

  const handleSendReaction = useCallback(
    (emoji) => {
      socket.emit("send-reaction", { emoji });
    },
    [socket]
  );

  const handleTyping = useCallback(
    (isTyping) => {
      if (isTyping) {
        socket.emit("typing-start");
      } else {
        socket.emit("typing-stop");
      }
    },
    [socket]
  );

  const handleSetVideo = useCallback(
    (videoData) => {
      // Check if currently screen sharing
      if (video && video.type === 'screen-share') {
        // Store the pending video data and show popup
        setPendingVideoData(videoData);
        setShowScreenSharePopup(true);
        return;
      }

      // Process and set video normally
      const videoType = detectVideoType(videoData);
      let processedVideoData;

      switch (videoType) {
        case "youtube":
          const videoId = extractYouTubeVideoId(videoData);
          if (!videoId) {
            setError("Invalid YouTube URL");
            return;
          }
          processedVideoData = {
            type: "youtube",
            videoId: videoId,
            url: videoData,
          };
          break;

        case "vimeo":
        case "dailymotion":
        case "twitch":
        case "facebook":
        case "instagram":
        case "tiktok":
        case "embed":
          processedVideoData = {
            type: videoType,
            url: videoData,
          };
          break;

        case "hls":
          processedVideoData = {
            type: "hls",
            url: videoData,
          };
          break;

        case "dash":
        case "direct":
        case "generic":
          processedVideoData = {
            type: videoType,
            url: videoData,
          };
          break;

        default:
          // Accept any URL and try to play it as generic
          processedVideoData = {
            type: "generic",
            url: videoData,
          };
          break;
      }


      socket.emit("set-video", processedVideoData);
      setError("");
    },
    [socket, video]
  );

  const handleSyncVideo = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    if (!video) {
      return;
    }

    if (!isHost) {
      return;
    }

    if (video.type === 'screen-share') {
      // Cannot sync screen share - it's a live stream
      return;
    }

    try {
      const currentTime = playerRef.current.getCurrentTime();
      const playerState = playerRef.current.getPlayerState();

      if (currentTime === undefined || currentTime === null) {
        return;
      }

      // Determine the action based on player state
      let action = "seek";
      if (playerState === 1) {
        // YT.PlayerState.PLAYING = 1
        action = "play";
      } else if (playerState === 2) {
        // YT.PlayerState.PAUSED = 2
        action = "pause";
      }

      // Emit sync action to all other users
      socket.emit("video-sync-request", {
        action,
        currentTime,
      });
    } catch (error) {
      console.error("Error during sync:", error);
    }
  }, [socket, isHost, video]);

  const handleScreenShare = useCallback((screenShareData) => {
    if (screenShareData) {
      // Set screen share as the main video locally (for the sharer)
      setVideo(screenShareData);
      console.log('🖥️ Local screen share set for sharer');
    } else {
      // Clear screen share locally (for the sharer)
      setVideo(null);
      console.log('🖥️ Local screen share cleared for sharer');
    }
    // Note: Server coordination is handled by ScreenShare component via socket events
  }, []);

  const handleStopScreenShareAndSetVideo = useCallback(() => {
    if (pendingVideoData) {
      // Process the pending video data first
      const videoType = detectVideoType(pendingVideoData);
      let processedVideoData;

      switch (videoType) {
        case "youtube":
          const videoId = extractYouTubeVideoId(pendingVideoData);
          if (!videoId) {
            setError("Invalid YouTube URL");
            setShowScreenSharePopup(false);
            setPendingVideoData(null);
            return;
          }
          processedVideoData = {
            type: "youtube",
            videoId: videoId,
            url: pendingVideoData,
          };
          break;

        case "vimeo":
        case "dailymotion":
        case "twitch":
        case "facebook":
        case "instagram":
        case "tiktok":
        case "embed":
          processedVideoData = {
            type: videoType,
            url: pendingVideoData,
          };
          break;

        case "hls":
          processedVideoData = {
            type: "hls",
            url: pendingVideoData,
          };
          break;

        case "dash":
        case "direct":
        case "generic":
          processedVideoData = {
            type: videoType,
            url: pendingVideoData,
          };
          break;

        default:
          // Accept any URL and try to play it as generic
          processedVideoData = {
            type: "generic",
            url: pendingVideoData,
          };
          break;
      }


      
      // Stop screen sharing first by triggering force stop
      setForceStopScreenShare(true);
      
      // Don't clear video state immediately, let the server response handle it
      // Reset force stop flag after a brief delay and set new video
      setTimeout(() => {
        setForceStopScreenShare(false);

        // Then emit the new video to server
        socket.emit("set-video", processedVideoData);
        setError("");
      }, 200); // Increased delay to ensure screen sharing stops properly
    }

    // Close popup and clear pending data
    setShowScreenSharePopup(false);
    setPendingVideoData(null);
  }, [pendingVideoData, socket]);

  const handleCancelVideoSet = useCallback(() => {
    // Just close popup and clear pending data
    setShowScreenSharePopup(false);
    setPendingVideoData(null);
  }, []);

  const handleCopyRoomCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopySuccess("Room code copied!");
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess("Room code copied!");
      setTimeout(() => setCopySuccess(""), 2000);
    }
  }, [roomCode]);

  const handleShareRoom = useCallback(async () => {
    const shareUrl = `${window.location.origin}?roomCode=${roomCode}`;

    if (navigator.share) {
      // Use native share API if available (mobile devices)
      try {
        await navigator.share({
          title: "Watch Together - Join my video room!",
          text: `🎬 Join me to watch videos together! Room: ${roomCode}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled sharing or error occurred
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy share link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess("Share link copied!");
        setTimeout(() => setCopySuccess(""), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopySuccess("Share link copied!");
        setTimeout(() => setCopySuccess(""), 2000);
      }
    }
  }, [roomCode]);

  const handleLeaveRoom = useCallback(() => {
    if (isHost && users.length > 1) {
      // Host needs to transfer host status before leaving
      setShowHostTransferPopup(true);
    } else {
      // Non-host or last user can leave directly
      onLeaveRoom();
    }
  }, [isHost, users.length, onLeaveRoom]);

  const handleTransferHost = useCallback(() => {
    if (selectedNewHost) {
      // Emit host transfer event to server
      socket.emit("transfer-host", { newHostUsername: selectedNewHost });

      // Add system message about host transfer
      const systemMessage = {
        id: `system-${Date.now()}-${Math.random()}`,
        type: "system",
        message: `👑 ${selectedNewHost} is now the host`,
        timestamp: new Date().toISOString(),
        icon: "👑",
      };
      setMessages((prev) => [...prev, systemMessage]);

      // Close popup and leave room
      setShowHostTransferPopup(false);
      setSelectedNewHost("");
      onLeaveRoom();
    }
  }, [selectedNewHost, socket, onLeaveRoom, setMessages]);

  const handleCancelHostTransfer = useCallback(() => {
    setShowHostTransferPopup(false);
    setSelectedNewHost("");
  }, []);

  const handleSwitchToChat = useCallback(() => {
    setActiveRightSection("chat");
  }, []);

  const handleSwitchToVideo = useCallback(() => {
    setActiveRightSection("video");
  }, []);

  // Memoize the video player to prevent re-renders when messages change
  const videoPlayer = useMemo(() => {
    if (!video) {
      return (
        <div className="video-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">🎬</div>
            <p>
              {isHost
                ? "Set a video to start watching together"
                : "Waiting for host to set a video..."}
            </p>
          </div>
        </div>
      );
    }

    // Use UniversalPlayer for all video types
    return (
      <UniversalPlayer
        ref={playerRef}
        videoData={video}
        onVideoAction={handleVideoAction}
      />
    );
  }, [video, isHost, handleVideoAction]);

  return (
    <div className="room-container">
      <div className="main-content">
        <div className="video-section">
          <div className="room-header">
            <div className="room-info">
              <div className="room-title-row">
                <div className="room-code-section">
                  <h2>
                    Room: <span className="room-code">{roomCode}</span>
                  </h2>
                  <div className="room-actions">
                    <button
                      className="action-btn copy-btn"
                      onClick={handleCopyRoomCode}
                      title="Copy room code"
                    >
                      📋
                    </button>
                    <button
                      className="action-btn share-btn"
                      onClick={handleShareRoom}
                      title="Share room link"
                    >
                      🔗
                    </button>
                  </div>
                </div>
                <div className="user-count-badge">
                  <span className="user-count">{users.length}/6</span>
                  <span className="user-count-label">users</span>
                </div>
              </div>
              <div className="room-status-row">
                <p className="room-status">
                  {console.log(
                    "🔍 RoomPage: Rendering status with isHost:",
                    isHost
                  )}
                  {isHost
                    ? "👑 You are the host - You control the video and room settings"
                    : `👥 Member - The host controls the video`}
                </p>
                {copySuccess && (
                  <span className="copy-success">{copySuccess}</span>
                )}
              </div>
            </div>
            <div className="header-actions">
              <button className="leave-btn" onClick={handleLeaveRoom}>
                Leave Room
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="video-container">{videoPlayer}</div>

          {!isHost && (
            <ScreenShare
              socket={socket}
              roomCode={roomCode}
              username={username}
              onScreenShare={handleScreenShare}
              forceStop={false}
              canShare={false}
              showControls={false}
            />
          )}

          {isHost && (
            <VideoControls
              onSetVideo={handleSetVideo}
              onSyncVideo={handleSyncVideo}
              video={video}
              isHost={isHost}
              socket={socket}
              roomCode={roomCode}
              username={username}
              onScreenShare={handleScreenShare}
              forceStopScreenShare={forceStopScreenShare}
            />
          )}
        </div>
      </div>

      <ResizablePanel className="right-sidebar">
        <div className="sidebar-tabs">
          <button
            className={`tab-btn ${
              activeRightSection === "chat" ? "active" : ""
            }`}
            onClick={handleSwitchToChat}
          >
            <span className="tab-icon">💬</span>
            <span className="tab-label">Chat</span>
          </button>
          <button
            className={`tab-btn ${
              activeRightSection === "video" ? "active" : ""
            }`}
            onClick={handleSwitchToVideo}
          >
            <span className="tab-icon">📹</span>
            <span className="tab-label">Video</span>
          </button>
        </div>

        <div className="sidebar-content">
          {activeRightSection === "chat" ? (
            <GroupChatSection
              users={users}
              messages={messages}
              typingUsers={typingUsers}
              currentUsername={username}
              onSendMessage={handleSendMessage}
              onSendReaction={handleSendReaction}
              onTyping={handleTyping}
              socket={socket}
            />
          ) : (
            <VideoCallSection />
          )}
        </div>
      </ResizablePanel>

      {/* Host Transfer Popup */}
      {showHostTransferPopup && (
        <HostTransferPopup
          users={users.filter((user) => user.username !== username)}
          selectedNewHost={selectedNewHost}
          onSelectHost={setSelectedNewHost}
          onTransferHost={handleTransferHost}
          onCancel={handleCancelHostTransfer}
        />
      )}

      {/* Screen Share Conflict Popup */}
      {showScreenSharePopup && (
        <ScreenShareConflictPopup
          onStopAndSetVideo={handleStopScreenShareAndSetVideo}
          onCancel={handleCancelVideoSet}
        />
      )}
    </div>
  );
};

const HostTransferPopup = ({
  users,
  selectedNewHost,
  onSelectHost,
  onTransferHost,
  onCancel,
}) => {
  return (
    <div className="popup-overlay">
      <div className="host-transfer-popup">
        <div className="popup-header">
          <h3>👑 Transfer Host Status</h3>
          <p>You must select a new host before leaving the room</p>
        </div>

        <div className="popup-content">
          <div className="host-selection">
            <h4>Select New Host:</h4>
            <div className="user-selection-list">
              {users.map((user) => (
                <label key={user.id} className="user-selection-item">
                  <input
                    type="radio"
                    name="newHost"
                    value={user.username}
                    checked={selectedNewHost === user.username}
                    onChange={(e) => onSelectHost(e.target.value)}
                  />
                  <span
                    className="user-selection-name"
                    style={{ color: user.color }}
                  >
                    {user.username}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="popup-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-transfer"
            onClick={onTransferHost}
            disabled={!selectedNewHost}
          >
            Transfer Host & Leave Room
          </button>
        </div>
      </div>
    </div>
  );
};

const VideoControls = ({ onSetVideo, onSyncVideo, video, isHost, socket, roomCode, username, onScreenShare, forceStopScreenShare }) => {
  const [videoUrl, setVideoUrl] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (videoUrl.trim()) {
      onSetVideo(videoUrl.trim());
      setVideoUrl("");
    }
  };

  const handleSync = () => {
    if (onSyncVideo) {
      onSyncVideo();
    }
  };

  return (
    <div className="video-controls">
      <form onSubmit={handleSubmit}>
        <div className="video-input">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste any video URL here (YouTube, Vimeo, direct links, streams)..."
          />
          <div className="video-buttons">
            <button type="submit">Set Video</button>
            {video && isHost && video.type !== 'screen-share' && (
              <button
                type="button"
                onClick={handleSync}
                className="sync-btn"
                title="Sync all members to your current video position and play state"
              >
                🔄 Sync All
              </button>
            )}
            <ScreenShare 
              socket={socket}
              roomCode={roomCode}
              username={username}
              onScreenShare={onScreenShare}
              forceStop={forceStopScreenShare}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

const ScreenShareConflictPopup = ({ onStopAndSetVideo, onCancel }) => {
  return (
    <div className="popup-overlay">
      <div className="screen-share-conflict-popup">
        <div className="popup-header">
          <h3>🖥️ Screen Share Active</h3>
          <p>You are currently sharing your screen. Do you want to stop screen sharing and set the new video?</p>
        </div>

        <div className="popup-content">
          <div className="conflict-info">
            <div className="info-item">
              <span className="info-icon">🖥️</span>
              <span className="info-text">Currently sharing your screen</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🎬</span>
              <span className="info-text">New video URL ready to set</span>
            </div>
          </div>
          <div className="conflict-warning">
            <p>⚠️ Setting a new video will stop your screen sharing session.</p>
          </div>
        </div>

        <div className="popup-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-stop-and-set" onClick={onStopAndSetVideo}>
            Stop Sharing & Set Video
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
