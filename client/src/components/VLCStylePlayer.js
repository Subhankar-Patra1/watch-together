import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";
import Hls from "hls.js";

const VLCStylePlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const isUserAction = useRef(false);
  const syncTimeout = useRef(null);
  const isPlayerReady = useRef(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");

  useImperativeHandle(ref, () => ({
    syncVideo: (data) => {
      if (videoRef.current && !isUserAction.current && isPlayerReady.current) {
        const video = videoRef.current;
        const currentTime = video.currentTime;
        const targetTime = data.currentTime;
        const timeDiff = Math.abs(currentTime - targetTime);

        if (timeDiff > 1) {
          video.currentTime = targetTime;
        }

        if (data.action === "play" && video.paused) {
          video.play().catch(console.error);
        } else if (data.action === "pause" && !video.paused) {
          video.pause();
        }
      }
    },
    getCurrentTime: () => {
      if (videoRef.current && isPlayerReady.current) {
        return videoRef.current.currentTime;
      }
      return 0;
    },
    getPlayerState: () => {
      if (videoRef.current && isPlayerReady.current) {
        return videoRef.current.paused ? "paused" : "playing";
      }
      return null;
    },
  }));

  const handleVideoEvent = useCallback(
    (action) => {
      if (!isUserAction.current || !isPlayerReady.current) return;

      const currentTime = videoRef.current?.currentTime || 0;

      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }

      syncTimeout.current = setTimeout(() => {
        onVideoAction(action, currentTime);
        isUserAction.current = false;
      }, 100);
    },
    [onVideoAction]
  );

  const initializeVLCStylePlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    console.log("🎥 VLC-Style: Starting initialization for:", videoUrl);
    setLoadingStatus("Detecting stream type...");
    setLoadingProgress(10);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
      isPlayerReady.current = false;
    }

    // VLC-style approach: Try multiple methods simultaneously
    const tryDirectLoad = async () => {
      return new Promise((resolve) => {
        const testVideo = document.createElement("video");
        testVideo.preload = "metadata";
        testVideo.crossOrigin = "anonymous";
        testVideo.muted = true;

        const timeout = setTimeout(() => {
          testVideo.src = "";
          resolve(false);
        }, 2000); // 2 second test

        testVideo.onloadedmetadata = () => {
          clearTimeout(timeout);
          testVideo.src = "";
          resolve(true);
        };

        testVideo.onerror = () => {
          clearTimeout(timeout);
          testVideo.src = "";
          resolve(false);
        };

        testVideo.src = videoUrl;
      });
    };

    const setupHLSWithVLCConfig = () => {
      setLoadingStatus("Setting up HLS with VLC optimizations...");
      setLoadingProgress(30);

      // VLC-inspired HLS configuration
      const hls = new Hls({
        // Network optimizations (VLC-style)
        maxBufferLength: 10, // Smaller buffer for faster start
        maxMaxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.1,

        // Aggressive loading (VLC-style)
        lowLatencyMode: true,
        backBufferLength: 0,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 3,

        // Fast manifest parsing
        manifestLoadingTimeOut: 3000,
        manifestLoadingMaxRetry: 2,
        manifestLoadingRetryDelay: 500,

        // Fast segment loading
        fragLoadingTimeOut: 5000,
        fragLoadingMaxRetry: 3,
        fragLoadingRetryDelay: 500,

        // Level loading optimizations
        levelLoadingTimeOut: 3000,
        levelLoadingMaxRetry: 2,
        levelLoadingRetryDelay: 500,

        // Start immediately
        autoStartLoad: true,
        startPosition: -1,

        // Bandwidth optimization
        abrEwmaFastLive: 1,
        abrEwmaSlowLive: 3,
        abrEwmaDefaultEstimate: 1000000, // 1Mbps default

        // Quality selection (start with lowest for speed)
        startLevel: 0,
        capLevelToPlayerSize: true,

        // Advanced optimizations
        enableWorker: false, // Sometimes faster without worker
        enableSoftwareAES: true,
        testBandwidth: false, // Skip bandwidth test for faster start

        // Fragment prefetching
        startFragPrefetch: true,

        // Error recovery
        maxStarvationDelay: 1,
        maxLoadingDelay: 1,
      });

      hlsRef.current = hls;

      // Aggressive preloading
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      // Progress tracking
      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        setLoadingStatus("Loading manifest...");
        setLoadingProgress(40);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setLoadingStatus("Manifest loaded, starting playback...");
        setLoadingProgress(70);
        console.log(
          "🎥 VLC-Style: Manifest parsed with",
          data.levels.length,
          "quality levels"
        );

        // VLC-style: Start with lowest quality for fastest loading
        if (data.levels.length > 0) {
          hls.startLevel = 0; // Start with lowest quality
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        setLoadingStatus("Quality level loaded...");
        setLoadingProgress(80);
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        setLoadingStatus("First fragment loaded!");
        setLoadingProgress(90);
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (!isPlayerReady.current) {
          setLoadingStatus("Ready to play!");
          setLoadingProgress(100);
          isPlayerReady.current = true;

          // Hide loading after a short delay
          setTimeout(() => {
            setLoadingProgress(0);
          }, 1000);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("🎥 VLC-Style HLS Error:", data);
        setLoadingStatus(`Error: ${data.details}`);

        if (data.fatal) {
          isPlayerReady.current = false;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setLoadingStatus("Network error, retrying...");
              setTimeout(() => hls.startLoad(), 100);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setLoadingStatus("Media error, recovering...");
              hls.recoverMediaError();
              break;
            default:
              setLoadingStatus("Fatal error occurred");
              hls.destroy();
              break;
          }
        }
      });

      // VLC-style quality management
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log(`🎥 VLC-Style: Switched to quality level ${data.level}`);
      });
    };

    // VLC approach: Try direct first, but don't wait long
    if (videoUrl.includes(".m3u8")) {
      // Definitely HLS, go straight to optimized HLS
      setupHLSWithVLCConfig();
    } else {
      // Try direct first (like VLC does)
      setLoadingStatus("Trying direct connection...");
      setLoadingProgress(20);

      tryDirectLoad().then((canPlayDirect) => {
        if (canPlayDirect) {
          setLoadingStatus("Direct connection successful!");
          setLoadingProgress(100);
          video.src = videoUrl;
          video.load();
          isPlayerReady.current = true;

          setTimeout(() => {
            setLoadingProgress(0);
          }, 1000);
        } else {
          // Fall back to HLS
          setupHLSWithVLCConfig();
        }
      });
    }
  }, [videoUrl]);

  useEffect(() => {
    initializeVLCStylePlayer();

    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initializeVLCStylePlayer]);

  // Handle user interactions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleUserInteraction = () => {
      isUserAction.current = true;
    };

    const handlePlay = () => handleVideoEvent("play");
    const handlePause = () => handleVideoEvent("pause");
    const handleSeeked = () => handleVideoEvent("seek");

    video.addEventListener("click", handleUserInteraction);
    video.addEventListener("keydown", handleUserInteraction);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("click", handleUserInteraction);
      video.removeEventListener("keydown", handleUserInteraction);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [handleVideoEvent]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <video
        ref={videoRef}
        controls
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
        }}
        preload="auto"
        crossOrigin="anonymous"
        playsInline
        muted={false}
        autoPlay={false}
      />

      {/* VLC-style loading overlay */}
      {loadingProgress > 0 && loadingProgress < 100 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontFamily: "Arial, sans-serif",
            zIndex: 1000,
          }}
        >
          <div style={{ marginBottom: "20px", fontSize: "18px" }}>
            VLC-Style Loading
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "300px",
              height: "6px",
              backgroundColor: "#333",
              borderRadius: "3px",
              marginBottom: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${loadingProgress}%`,
                height: "100%",
                backgroundColor: "#ff6600",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ fontSize: "14px", opacity: 0.8 }}>{loadingStatus}</div>

          <div style={{ fontSize: "12px", opacity: 0.6, marginTop: "5px" }}>
            {loadingProgress}%
          </div>
        </div>
      )}
    </div>
  );
});

VLCStylePlayer.displayName = "VLCStylePlayer";

export default VLCStylePlayer;
