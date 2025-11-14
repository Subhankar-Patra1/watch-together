import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";
import youtubeAPI from "../utils/youtubeAPI";

const YouTubePlayer = forwardRef(({ videoId, onVideoAction }, ref) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const playerDivRef = useRef(null);
  const isUserAction = useRef(false);
  const syncTimeout = useRef(null);
  const currentVideoId = useRef(null);
  const isPlayerReady = useRef(false);
  const isMounted = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);

  useImperativeHandle(ref, () => ({
    syncVideo: (data) => {
      if (playerRef.current && !isUserAction.current && isPlayerReady.current && isMounted.current && playerRef.current.getPlayerState) {
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
      if (playerRef.current && isPlayerReady.current && isMounted.current && playerRef.current.getCurrentTime) {
        return playerRef.current.getCurrentTime();
      }
      return 0;
    },
    getPlayerState: () => {
      if (playerRef.current && isPlayerReady.current && isMounted.current && playerRef.current.getPlayerState) {
        return playerRef.current.getPlayerState();
      }
      return null;
    },
  }));

  const onPlayerReady = useCallback((event) => {
    if (isMounted.current) {
      isPlayerReady.current = true;
      setPlayerReady(true);
      setIsLoading(false);
    }
  }, []);

  const onPlayerStateChange = useCallback(
    (event) => {
      if (!isUserAction.current || !isPlayerReady.current || !isMounted.current || !event.target) return;

      try {
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
      } catch (error) {
        console.warn('🎥 Error in onPlayerStateChange:', error);
      }
    },
    [onVideoAction]
  );

  const initializePlayer = useCallback(() => {
    if (!isMounted.current || !containerRef.current || !videoId) return;
    
    // If we have an existing player and it's ready, just load the new video
    if (playerRef.current && isPlayerReady.current && videoId !== currentVideoId.current) {
      try {
        setIsLoading(true);
        setPlayerReady(false);
        playerRef.current.loadVideoById(videoId);
        currentVideoId.current = videoId;
        // Loading state will be cleared by onPlayerReady
        return;
      } catch (error) {
        console.warn('🎥 Error loading video by ID, recreating player:', error);
        // Fall through to recreate player
      }
    }

    // Only create new player if we don't have one or if it's not working
    if (!playerRef.current || !isPlayerReady.current) {
      
      // Destroy existing player if it exists
      if (playerRef.current && playerRef.current.destroy) {
        try {
          isPlayerReady.current = false;
          setPlayerReady(false);
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (error) {
          console.warn('🎥 Error destroying YouTube player:', error);
        }
      }

      // Create a new div for the YouTube player
      if (containerRef.current) {
        // Remove old player div if it exists
        if (playerDivRef.current && playerDivRef.current.parentNode) {
          try {
            playerDivRef.current.parentNode.removeChild(playerDivRef.current);
          } catch (error) {
            console.warn('🎥 Error removing old player div:', error);
          }
        }
        
        // Create new player div
        playerDivRef.current = document.createElement('div');
        playerDivRef.current.style.width = '100%';
        playerDivRef.current.style.height = '100%';
        containerRef.current.appendChild(playerDivRef.current);
      }

      // Create new player
      try {
        if (!playerDivRef.current || !isMounted.current) return;

        setIsLoading(true);
        setPlayerReady(false);
        const origin = window.location.origin;
        const widgetReferrer = window.location.href;
        playerRef.current = new window.YT.Player(playerDivRef.current, {
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
            origin,
            widget_referrer: widgetReferrer
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: (event) => {
              console.error('🎥 YouTube player error:', event.data);
              // Provide a clearer explanation for common restriction errors
              if (event.data === 150 || event.data === 101) {
                setLoadingError(
                  'YouTube error 150/101: The video is restricted for embedding or requires sign-in on YouTube. Click "Watch on YouTube" to open it directly.'
                );
              } else {
                setLoadingError(`YouTube error: ${event.data}`);
              }
              setIsLoading(false);
            }
          },
        });

        currentVideoId.current = videoId;
        
        // Fallback timeout in case onPlayerReady doesn't fire
        setTimeout(() => {
          if (isLoading && isMounted.current) {
            setIsLoading(false);
            setPlayerReady(true);
          }
        }, 10000); // 10 second timeout
        
      } catch (error) {
        console.error('🎥 Error creating YouTube player:', error);
        setLoadingError(error.message);
        setIsLoading(false);
      }
    }
  }, [videoId, onPlayerReady, onPlayerStateChange]);

  useEffect(() => {
    let mounted = true;

    const loadAndInitialize = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);
        
        // Use the global API loader
        await youtubeAPI.load();
        
        if (mounted && isMounted.current) {
          initializePlayer();
          
          // Additional fallback: check if player becomes ready after a short delay
          setTimeout(() => {
            if (mounted && isMounted.current && playerRef.current && isLoading) {
              try {
                // Try to check if player is actually ready
                const state = playerRef.current.getPlayerState();
                if (state !== undefined && state !== null) {
                  setIsLoading(false);
                  setPlayerReady(true);
                  isPlayerReady.current = true;
                }
              } catch (error) {
                // Player not ready yet, keep loading
              }
            }
          }, 2000); // Check after 2 seconds
        }
      } catch (error) {
        console.error('Failed to load YouTube API:', error);
        if (mounted) {
          setLoadingError(error.message);
          setIsLoading(false);
        }
      }
    };

    loadAndInitialize();

    // Cleanup
    return () => {
      mounted = false;
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
    };
  }, [initializePlayer]);

  // Only destroy player on unmount, not on re-renders
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      isPlayerReady.current = false;
      
      // Clear any pending timeouts first
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
        syncTimeout.current = null;
      }
      
      // Destroy player safely
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('🎥 Error destroying YouTube player on unmount:', error);
        }
        playerRef.current = null;
      }
      
      // Remove player div safely
      if (playerDivRef.current && playerDivRef.current.parentNode) {
        try {
          playerDivRef.current.parentNode.removeChild(playerDivRef.current);
        } catch (error) {
          console.warn('🎥 Error removing player div on unmount:', error);
        }
        playerDivRef.current = null;
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

  const setContainerRef = useCallback((node) => {
    if (node) {
      containerRef.current = node;
    } else {
      // Component is unmounting, clean up
      if (containerRef.current) {
        containerRef.current = null;
      }
    }
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        position: "relative",
      }}
    >
      <div
        ref={setContainerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      
      {/* Loading indicator */}
      {(isLoading || !playerReady) && !loadingError && (
        <div
          onClick={() => {
            setIsLoading(false);
            setPlayerReady(true);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            fontSize: "16px",
            zIndex: 1000,
            cursor: "pointer",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid #333",
                borderTop: "3px solid #fff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 10px",
              }}
            />
            Loading YouTube video...
            <div style={{ fontSize: "12px", marginTop: "10px", opacity: 0.7 }}>
              Click to dismiss if stuck
            </div>
          </div>
        </div>
      )}
      
      {/* Error indicator */}
      {loadingError && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "#ff6b6b",
            fontSize: "16px",
            zIndex: 1000,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>⚠️</div>
            Failed to load YouTube video
            <div style={{ fontSize: "12px", marginTop: "5px", opacity: 0.7 }}>
              {loadingError}
            </div>
            {(String(loadingError).includes('150') || String(loadingError).includes('101')) && (
              <div style={{ marginTop: 12 }}>
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#4ECDC4', textDecoration: 'underline' }}
                >
                  Watch on YouTube
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

YouTubePlayer.displayName = "YouTubePlayer";

export default YouTubePlayer;
