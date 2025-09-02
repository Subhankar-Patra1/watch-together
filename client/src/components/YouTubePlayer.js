import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";

const YouTubePlayer = forwardRef(({ videoId, onVideoAction }, ref) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const isUserAction = useRef(false);
  const syncTimeout = useRef(null);
  const currentVideoId = useRef(null);
  const isPlayerReady = useRef(false);

  useImperativeHandle(ref, () => ({
    syncVideo: (data) => {
      if (playerRef.current && !isUserAction.current && isPlayerReady.current) {
        const player = playerRef.current;
        const currentTime = player.getCurrentTime();
        const targetTime = data.currentTime;
        const timeDiff = Math.abs(currentTime - targetTime);

        // Only sync if difference is significant (more than 1 second)
        if (timeDiff > 1) {
          player.seekTo(targetTime, true);
        }

        if (data.action === "play" && player.getPlayerState() !== 1) {
          player.playVideo();
        } else if (data.action === "pause" && player.getPlayerState() === 1) {
          player.pauseVideo();
        }
      }
    },
    getCurrentTime: () => {
      console.log("🎥 getCurrentTime called");
      if (playerRef.current && isPlayerReady.current) {
        const time = playerRef.current.getCurrentTime();
        console.log("🎥 Current time:", time);
        return time;
      }
      console.log("🎥 Player not ready, returning 0");
      return 0;
    },
    getPlayerState: () => {
      console.log("🎥 getPlayerState called");
      if (playerRef.current && isPlayerReady.current) {
        const state = playerRef.current.getPlayerState();
        console.log("🎥 Player state:", state);
        return state;
      }
      console.log("🎥 Player not ready, returning null");
      return null;
    },
  }));

  const onPlayerReady = useCallback((event) => {
    isPlayerReady.current = true;
  }, []);

  const onPlayerStateChange = useCallback(
    (event) => {
      if (!isUserAction.current || !isPlayerReady.current) return;

      const currentTime = event.target.getCurrentTime();

      // Clear any pending sync timeout
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }

      // Debounce the action to avoid spam
      syncTimeout.current = setTimeout(() => {
        switch (event.data) {
          case window.YT.PlayerState.PLAYING:
            onVideoAction("play", currentTime);
            break;
          case window.YT.PlayerState.PAUSED:
            onVideoAction("pause", currentTime);
            break;
          default:
            break;
        }
        isUserAction.current = false;
      }, 100);
    },
    [onVideoAction]
  );

  const initializePlayer = useCallback(() => {
    if (containerRef.current && videoId && videoId !== currentVideoId.current) {
      // Destroy existing player if it exists
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        isPlayerReady.current = false;
      }

      // Clear the container
      containerRef.current.innerHTML = "";

      // Create new player
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });

      currentVideoId.current = videoId;
    } else if (
      playerRef.current &&
      videoId &&
      videoId !== currentVideoId.current &&
      isPlayerReady.current
    ) {
      // Just change the video without recreating the player
      playerRef.current.loadVideoById(videoId);
      currentVideoId.current = videoId;
    }
  }, [videoId, onPlayerReady, onPlayerStateChange]);

  useEffect(() => {
    // Load YouTube IFrame API only once
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    // Cleanup
    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
    };
  }, [initializePlayer]);

  // Only destroy player on unmount, not on re-renders
  useEffect(() => {
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Handle user interactions
  useEffect(() => {
    const handleUserInteraction = () => {
      isUserAction.current = true;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handleUserInteraction);
      container.addEventListener("keydown", handleUserInteraction);

      return () => {
        container.removeEventListener("click", handleUserInteraction);
        container.removeEventListener("keydown", handleUserInteraction);
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
      }}
    />
  );
});

YouTubePlayer.displayName = "YouTubePlayer";

export default YouTubePlayer;
