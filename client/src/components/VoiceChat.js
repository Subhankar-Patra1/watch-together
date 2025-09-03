import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

const VoiceChat = forwardRef(
  ({ socket, currentUsername, users, onVoiceChatUpdate }, ref) => {
    const [isInVoiceChat, setIsInVoiceChat] = useState(false);
    const [isStartingVoice, setIsStartingVoice] = useState(false);
    const [voiceChatMembers, setVoiceChatMembers] = useState([]);
    const [activeVoiceChat, setActiveVoiceChat] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [peerConnections, setPeerConnections] = useState(new Map());
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [debugInfo, setDebugInfo] = useState("");
    const [pendingOffers, setPendingOffers] = useState([]);
    const [pendingIceCandidates, setPendingIceCandidates] = useState(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [mutedUsers, setMutedUsers] = useState(new Map());

    const remoteAudioRefs = useRef(new Map());

    // WebRTC configuration
    const rtcConfig = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10,
    };

    useEffect(() => {
      // Listen for voice chat events
      socket.on("voice-chat-started", (data) => {
        setActiveVoiceChat(data);
        // Initialize with the host as the first member
        const initialMembers = [currentUsername];
        setVoiceChatMembers(initialMembers);
        onVoiceChatUpdate?.({
          activeVoiceChat: data,
          voiceChatMembers: initialMembers,
          mutedUsers: mutedUsers,
        });
      });

      socket.on("voice-chat-ended", () => {
        setActiveVoiceChat(null);
        setIsInVoiceChat(false);
        setVoiceChatMembers([]);
        endVoiceChat();
        onVoiceChatUpdate?.({
          activeVoiceChat: null,
          voiceChatMembers: [],
          mutedUsers: new Map(),
        });
      });

      socket.on("voice-chat-member-joined", (data) => {
        console.log("Member joined event received:", data);
        console.log("Current members before update:", voiceChatMembers);
        console.log("New members list:", data.members);

        setVoiceChatMembers(data.members);

        // Update parent component with new member list
        onVoiceChatUpdate?.({
          activeVoiceChat: activeVoiceChat,
          voiceChatMembers: data.members,
          mutedUsers: mutedUsers,
        });

        // Use a timeout to ensure local stream is ready
        setTimeout(() => {
          if (
            data.newMember !== currentUsername &&
            isInVoiceChat &&
            localStream
          ) {
            // Handle new peer joining
            console.log("Initiating connection to new peer:", data.socketId);
            handleNewPeerJoined(data.newMember, data.socketId);
          }

          // If I'm the new member, I need to connect to existing members
          if (
            data.newMember === currentUsername &&
            data.existingMembers &&
            localStream
          ) {
            console.log(
              "I'm the new member, connecting to existing members:",
              data.existingMembers
            );
            data.existingMembers.forEach((member) => {
              if (member.socketId !== socket.id) {
                handleNewPeerJoined(member.username, member.socketId);
              }
            });
          }
        }, 100); // Small delay to ensure state is updated
      });

      socket.on("voice-chat-member-left", (data) => {
        setVoiceChatMembers(data.members);

        // Update parent component with new member list
        onVoiceChatUpdate?.({
          activeVoiceChat: activeVoiceChat,
          voiceChatMembers: data.members,
          mutedUsers: mutedUsers,
        });

        if (data.leftMember !== currentUsername) {
          // Handle peer leaving
          handlePeerLeft(data.socketId);
        }
      });

      // Listen for general member updates that go to all room members
      socket.on("voice-chat-member-updated", (data) => {
        console.log("Voice chat member updated (broadcast):", data);
        setVoiceChatMembers(data.members);

        // Update parent component with new member list
        onVoiceChatUpdate?.({
          activeVoiceChat: activeVoiceChat,
          voiceChatMembers: data.members,
          mutedUsers: mutedUsers,
        });
      });

      // WebRTC signaling events
      socket.on("voice-offer", async (data) => {
        console.log(
          "Received voice-offer, isInVoiceChat:",
          isInVoiceChat,
          "activeVoiceChat:",
          !!activeVoiceChat,
          "localStream:",
          !!localStream
        );

        // Accept offers if we have an active voice chat or are in voice chat
        if (isInVoiceChat || activeVoiceChat) {
          if (localStream) {
            await handleOffer(data);
          } else {
            console.log("Queueing offer until local stream is ready");
            setPendingOffers((prev) => [...prev, data]);
          }
        } else {
          console.log("Ignoring offer - not in voice chat");
        }
      });

      socket.on("voice-answer", async (data) => {
        console.log("Received voice-answer, isInVoiceChat:", isInVoiceChat);
        if (isInVoiceChat || activeVoiceChat) {
          await handleAnswer(data);
        } else {
          console.log("Ignoring answer - not in voice chat");
        }
      });

      socket.on("voice-ice-candidate", async (data) => {
        console.log(
          "Received voice-ice-candidate, isInVoiceChat:",
          isInVoiceChat,
          "activeVoiceChat:",
          !!activeVoiceChat
        );

        if (isInVoiceChat || activeVoiceChat) {
          if (peerConnections.has(data.fromSocketId)) {
            await handleIceCandidate(data);
          } else {
            console.log("Queueing ICE candidate for", data.fromSocketId);
            setPendingIceCandidates((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(data.fromSocketId) || [];
              newMap.set(data.fromSocketId, [...existing, data]);
              return newMap;
            });
          }
        } else {
          console.log("Ignoring ICE candidate - not in voice chat");
        }
      });

      // Listen for mute status updates
      socket.on("voice-chat-mute-status", (data) => {
        console.log("Mute status update:", data);
        setMutedUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.username, data.isMuted);
          return newMap;
        });
      });

      return () => {
        socket.off("voice-chat-started");
        socket.off("voice-chat-ended");
        socket.off("voice-chat-member-joined");
        socket.off("voice-chat-member-left");
        socket.off("voice-chat-member-updated");
        socket.off("voice-offer");
        socket.off("voice-answer");
        socket.off("voice-ice-candidate");
        socket.off("voice-chat-mute-status");
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, currentUsername, isInVoiceChat]);

    // Process pending offers when local stream becomes available
    const processPendingOffers = async () => {
      if (!localStream) return;

      console.log("Processing", pendingOffers.length, "pending offers");
      for (const offer of pendingOffers) {
        await handleOffer(offer);
      }
      setPendingOffers([]);
    };

    // Process pending ICE candidates for a specific peer
    const processPendingIceCandidates = async (socketId) => {
      const candidates = pendingIceCandidates.get(socketId);
      if (!candidates || candidates.length === 0) return;

      const peerConnection = peerConnections.get(socketId);
      if (!peerConnection || !peerConnection.remoteDescription) {
        console.log(
          "Cannot process ICE candidates - no peer connection or remote description for",
          socketId
        );
        return;
      }

      console.log(
        "Processing",
        candidates.length,
        "pending ICE candidates for",
        socketId
      );

      for (const candidateData of candidates) {
        try {
          await peerConnection.addIceCandidate(candidateData.candidate);
          console.log("Successfully added pending ICE candidate for", socketId);
        } catch (error) {
          console.error("Error adding pending ICE candidate:", error);
        }
      }

      setPendingIceCandidates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
    };

    const startVoiceChat = async () => {
      try {
        setIsStartingVoice(true);
        console.log("Starting voice chat...");
        setDebugInfo("Starting voice chat...");

        // Get user media (microphone)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        console.log("Got local stream:", stream);
        console.log(
          "Local stream tracks:",
          stream.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled }))
        );
        setDebugInfo(
          `Local stream acquired: ${stream.getTracks().length} tracks`
        );

        setLocalStream(stream);

        // Process any pending offers now that we have a local stream
        setTimeout(() => processPendingOffers(), 100);

        // Emit start voice chat event
        socket.emit("start-voice-chat", {
          username: currentUsername,
        });

        setIsInVoiceChat(true);
        setIsStartingVoice(false);
        setDebugInfo("Voice chat started successfully");
        console.log("Voice chat started successfully");
      } catch (error) {
        console.error("Error starting voice chat:", error);
        setIsStartingVoice(false);
        setDebugInfo(`Error: ${error.message}`);
        alert("Could not access microphone. Please check your permissions.");
      }
    };

    const joinVoiceChat = async () => {
      try {
        setIsStartingVoice(true);
        console.log("Joining voice chat...");

        // Get user media (microphone)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        console.log("Got local stream for joining:", stream);
        console.log(
          "Local stream tracks:",
          stream.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled }))
        );

        setLocalStream(stream);

        // Process any pending offers now that we have a local stream
        setTimeout(() => processPendingOffers(), 100);

        // Emit join voice chat event
        socket.emit("join-voice-chat", {
          username: currentUsername,
        });

        setIsInVoiceChat(true);
        setIsStartingVoice(false);
        console.log("Joined voice chat successfully");
      } catch (error) {
        console.error("Error joining voice chat:", error);
        setIsStartingVoice(false);
        alert("Could not access microphone. Please check your permissions.");
      }
    };

    const leaveVoiceChat = () => {
      socket.emit("leave-voice-chat", {
        username: currentUsername,
      });

      endVoiceChat();
      setIsInVoiceChat(false);
    };

    const endVoiceChat = () => {
      // Clean up local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      // Clean up peer connections
      peerConnections.forEach((pc) => pc.close());
      setPeerConnections(new Map());
      setRemoteStreams(new Map());
    };

    const toggleMute = () => {
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          const newMutedState = !audioTrack.enabled;
          setIsMuted(newMutedState);

          // Emit mute status to other users
          socket.emit("voice-chat-mute-status", {
            username: currentUsername,
            isMuted: newMutedState,
          });

          console.log(`🔇 Audio ${audioTrack.enabled ? "unmuted" : "muted"}`);
        }
      }
    };

    const handleNewPeerJoined = async (username, socketId) => {
      if (!localStream) {
        console.error("No local stream available for peer connection");
        return;
      }

      console.log(`🔄 Creating peer connection for ${username} (${socketId})`);

      try {
        const peerConnection = new RTCPeerConnection(rtcConfig);

        // Add transceiver for audio to ensure we can receive audio
        peerConnection.addTransceiver("audio", { direction: "sendrecv" });

        // Add local stream to peer connection
        localStream.getTracks().forEach((track) => {
          console.log(
            "Adding track to peer connection:",
            track.kind,
            track.enabled
          );
          peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log("🎵 Received remote track from", socketId, event);
          const [remoteStream] = event.streams;
          console.log(
            "Remote stream tracks:",
            remoteStream
              .getTracks()
              .map((t) => ({ kind: t.kind, enabled: t.enabled }))
          );

          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.set(socketId, remoteStream);
            console.log(
              "🎵 Updated remote streams map:",
              newMap.size,
              "streams"
            );
            return newMap;
          });

          setDebugInfo(`🎵 Sending audio to ${socketId}`);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate to", socketId);
            socket.emit("voice-ice-candidate", {
              candidate: event.candidate,
              targetSocketId: socketId,
            });
          }
        };

        // Connection state monitoring
        peerConnection.onconnectionstatechange = () => {
          console.log(
            `🔗 Connection state with ${socketId}:`,
            peerConnection.connectionState
          );
          setDebugInfo(`Connection: ${peerConnection.connectionState}`);
        };

        // Create and send offer
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await peerConnection.setLocalDescription(offer);

        console.log("📤 Sending offer to", socketId);
        socket.emit("voice-offer", {
          offer,
          targetSocketId: socketId,
        });

        setPeerConnections(
          (prev) => new Map(prev.set(socketId, peerConnection))
        );

        // Process any pending ICE candidates for this peer
        setTimeout(() => processPendingIceCandidates(socketId), 100);
      } catch (error) {
        console.error("Error handling new peer:", error);
      }
    };

    const handlePeerLeft = (socketId) => {
      const peerConnection = peerConnections.get(socketId);
      if (peerConnection) {
        peerConnection.close();
        setPeerConnections((prev) => {
          const newMap = new Map(prev);
          newMap.delete(socketId);
          return newMap;
        });
      }

      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
    };

    const handleOffer = async (data) => {
      console.log("Received offer from", data.fromSocketId);
      console.log(
        "Current state - localStream:",
        !!localStream,
        "isInVoiceChat:",
        isInVoiceChat
      );

      // If we don't have local stream yet, wait a bit and retry
      if (!localStream) {
        console.log("No local stream yet, waiting...");
        setTimeout(() => {
          if (localStream) {
            console.log("Retrying handleOffer with local stream");
            handleOffer(data);
          } else {
            console.error("Still no local stream after wait");
          }
        }, 500);
        return;
      }

      try {
        const peerConnection = new RTCPeerConnection(rtcConfig);

        // Add transceiver for audio to ensure we can receive audio
        peerConnection.addTransceiver("audio", { direction: "sendrecv" });

        // Add local stream to peer connection
        localStream.getTracks().forEach((track) => {
          console.log(
            "Adding local track to answer peer connection:",
            track.kind,
            track.enabled
          );
          peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log(
            "🎵 Received remote track in offer handler from",
            data.fromSocketId,
            event
          );
          const [remoteStream] = event.streams;
          console.log(
            "Remote stream tracks:",
            remoteStream
              .getTracks()
              .map((t) => ({ kind: t.kind, enabled: t.enabled }))
          );

          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.set(data.fromSocketId, remoteStream);
            console.log(
              "🎵 Updated remote streams map in offer handler:",
              newMap.size,
              "streams"
            );
            return newMap;
          });

          setDebugInfo(`🎵 Receiving audio from ${data.fromSocketId}`);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(
              "Sending ICE candidate in response to",
              data.fromSocketId
            );
            socket.emit("voice-ice-candidate", {
              candidate: event.candidate,
              targetSocketId: data.fromSocketId,
            });
          }
        };

        // Connection state monitoring
        peerConnection.onconnectionstatechange = () => {
          console.log(
            `🔗 Connection state with ${data.fromSocketId}:`,
            peerConnection.connectionState
          );
          setDebugInfo(`Connection: ${peerConnection.connectionState}`);
        };

        // Set remote description and create answer
        await peerConnection.setRemoteDescription(data.offer);
        console.log("Remote description set for offer from", data.fromSocketId);

        const answer = await peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await peerConnection.setLocalDescription(answer);

        console.log("Sending answer to", data.fromSocketId);
        socket.emit("voice-answer", {
          answer,
          targetSocketId: data.fromSocketId,
        });

        setPeerConnections(
          (prev) => new Map(prev.set(data.fromSocketId, peerConnection))
        );

        // Process any pending ICE candidates for this peer after remote description is set
        setTimeout(() => processPendingIceCandidates(data.fromSocketId), 100);
      } catch (error) {
        console.error("Error handling offer:", error);
        setDebugInfo(`Error: ${error.message}`);
      }
    };

    const handleAnswer = async (data) => {
      console.log("Received answer from", data.fromSocketId);
      try {
        const peerConnection = peerConnections.get(data.fromSocketId);
        if (peerConnection) {
          await peerConnection.setRemoteDescription(data.answer);
          console.log(
            "Successfully set remote description for answer from",
            data.fromSocketId
          );

          // Process any pending ICE candidates now that remote description is set
          setTimeout(() => processPendingIceCandidates(data.fromSocketId), 100);
        } else {
          console.error("No peer connection found for", data.fromSocketId);
        }
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIceCandidate = async (data) => {
      console.log("Received ICE candidate from", data.fromSocketId);
      try {
        const peerConnection = peerConnections.get(data.fromSocketId);
        if (peerConnection) {
          // Check if remote description is set before adding ICE candidate
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(data.candidate);
            console.log(
              "Successfully added ICE candidate from",
              data.fromSocketId
            );
          } else {
            console.log(
              "Remote description not set yet, queuing ICE candidate for",
              data.fromSocketId
            );
            // Queue the ICE candidate until remote description is set
            setPendingIceCandidates((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(data.fromSocketId) || [];
              newMap.set(data.fromSocketId, [...existing, data]);
              return newMap;
            });
          }
        } else {
          console.error(
            "No peer connection found for ICE candidate from",
            data.fromSocketId
          );
          // Queue for when peer connection is created
          setPendingIceCandidates((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(data.fromSocketId) || [];
            newMap.set(data.fromSocketId, [...existing, data]);
            return newMap;
          });
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
      }
    };

    // Auto-play remote audio streams
    useEffect(() => {
      console.log("🔊 Remote streams updated:", remoteStreams.size, "streams");
      remoteStreams.forEach((stream, socketId) => {
        const audioElement = remoteAudioRefs.current.get(socketId);
        console.log(`🔊 Processing stream for ${socketId}:`, {
          audioElement: !!audioElement,
          stream: !!stream,
          streamTracks: stream?.getTracks().length || 0,
        });

        if (audioElement && audioElement.srcObject !== stream) {
          console.log(`🔊 Setting audio source for ${socketId}`);
          audioElement.srcObject = stream;
          audioElement.volume = 1.0;
          audioElement.muted = false;

          // Verify stream has audio tracks
          const audioTracks = stream.getAudioTracks();
          console.log(
            `🔊 Audio tracks for ${socketId}:`,
            audioTracks.map((t) => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
            }))
          );

          // Try to play the audio
          const playPromise = audioElement.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`✅ Audio playing for ${socketId}`);
                setDebugInfo(`✅ Playing audio from ${socketId}`);
              })
              .catch((error) => {
                console.error(`❌ Error playing audio for ${socketId}:`, error);
                setDebugInfo(`❌ Audio blocked - click to enable`);
                // Try again after user interaction
                const tryPlayAgain = () => {
                  audioElement
                    .play()
                    .then(() => {
                      console.log(
                        `✅ Audio playing for ${socketId} after retry`
                      );
                      setDebugInfo(`✅ Audio enabled for ${socketId}`);
                      document.removeEventListener("click", tryPlayAgain);
                    })
                    .catch(console.error);
                };
                document.addEventListener("click", tryPlayAgain, {
                  once: true,
                });
              });
          }
        }
      });
    }, [remoteStreams]);

    const enableAudioPlayback = () => {
      console.log("Enabling audio playback...");
      remoteStreams.forEach((stream, socketId) => {
        const audioElement = remoteAudioRefs.current.get(socketId);
        if (audioElement) {
          audioElement
            .play()
            .then(() => {
              console.log(`✅ Audio enabled for ${socketId}`);
              setDebugInfo(`Audio enabled for ${socketId}`);
            })
            .catch(console.error);
        }
      });
    };

    // Expose joinVoiceChat function to parent component
    useImperativeHandle(ref, () => ({
      joinVoiceChat: () => joinVoiceChat(),
    }));

    return (
      <div className="voice-chat-container" onClick={enableAudioPlayback}>
        {/* Voice Chat Button */}
        {!activeVoiceChat ? (
          <button
            className="voice-chat-btn start-voice"
            onClick={startVoiceChat}
            disabled={isStartingVoice}
            title="Start Voice Chat"
          >
            {isStartingVoice ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <span className="mic-icon">🎤</span>
            )}
          </button>
        ) : !isInVoiceChat ? (
          <button
            className="voice-chat-btn join-voice"
            onClick={joinVoiceChat}
            disabled={isStartingVoice}
            title="Join Voice Chat"
          >
            {isStartingVoice ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <span className="join-icon">🔊</span>
            )}
          </button>
        ) : (
          <>
            <button
              className="voice-chat-btn mute-voice"
              onClick={toggleMute}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              style={{ marginRight: "5px" }}
            >
              <span className="mute-icon">{isMuted ? "🔇" : "🎤"}</span>
            </button>
            <button
              className="voice-chat-btn leave-voice active"
              onClick={leaveVoiceChat}
              title="Leave Voice Chat"
            >
              <span className="leave-icon">❌</span>
            </button>
          </>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div
            style={{
              position: "absolute",
              top: "-100px",
              left: "0",
              background: "rgba(0,0,0,0.8)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              whiteSpace: "nowrap",
              zIndex: 1001,
            }}
          >
            {debugInfo}
          </div>
        )}

        {/* Hidden audio elements for remote streams */}
        {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
          return (
            <audio
              key={`audio-${socketId}`}
              ref={(el) => {
                if (el) {
                  remoteAudioRefs.current.set(socketId, el);
                  if (el.srcObject !== stream) {
                    el.srcObject = stream;
                    el.volume = 1.0;
                    el.muted = false;

                    // Try to play immediately
                    el.play()
                      .then(() => {
                        console.log(`✅ Audio auto-playing for ${socketId}`);
                        setDebugInfo(`Audio playing from ${socketId}`);
                      })
                      .catch((error) => {
                        console.error(
                          `❌ Auto-play failed for ${socketId}:`,
                          error
                        );
                        setDebugInfo(
                          `Audio blocked for ${socketId} - click to enable`
                        );
                      });
                  }
                } else {
                  remoteAudioRefs.current.delete(socketId);
                }
              }}
              autoPlay
              playsInline
              controls={false}
              muted={false}
              style={{ display: "none" }}
            />
          );
        })}
      </div>
    );
  }
);

export default VoiceChat;
