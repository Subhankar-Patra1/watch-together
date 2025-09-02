import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";
import Hls from "hls.js";

const CORSBypassPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
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

  const createProxyUrl = (originalUrl) => {
    // Use our server as a CORS proxy
    const serverUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5000"
        : window.location.origin;

    return `${serverUrl}/api/proxy-stream?url=${encodeURIComponent(
      originalUrl
    )}`;
  };

  const initializeCORSBypassPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    console.log("🎥 CORS Bypass: Starting initialization for:", videoUrl);
    setLoadingStatus("Setting up CORS bypass...");
    setLoadingProgress(10);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
      isPlayerReady.current = false;
    }

    // Create proxied URL
    const proxiedUrl = createProxyUrl(videoUrl);
    console.log("🎥 CORS Bypass: Using proxy URL:", proxiedUrl);

    const setupHLSWithProxy = () => {
      setLoadingStatus("Loading through proxy...");
      setLoadingProgress(30);

      // Custom HLS loader that uses our proxy (but prevents recursive proxying)
      class ProxyLoader extends Hls.DefaultConfig.loader {
        load(context, config, callbacks) {
          // Only proxy if the URL is not already proxied
          if (context.url && !context.url.includes("/api/proxy-stream")) {
            console.log("🎥 Proxying URL:", context.url);
            context.url = createProxyUrl(context.url);
          } else if (context.url && context.url.includes("/api/proxy-stream")) {
            console.log("🎥 URL already proxied, using as-is:", context.url);
          }
          super.load(context, config, callbacks);
        }
      }

      // HLS configuration optimized for CORS bypass
      const hls = new Hls({
        // Use our custom loader
        loader: ProxyLoader,

        // Fast loading settings
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        lowLatencyMode: true,

        // Extended timeouts for streaming sites with CORS proxy
        manifestLoadingTimeOut: 20000, // 20 seconds for manifest
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 2000,

        fragLoadingTimeOut: 30000, // 30 seconds for video fragments
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 2000,

        levelLoadingTimeOut: 15000, // 15 seconds for quality levels
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 2000,

        // Start with lowest quality for speed
        startLevel: 0,
        autoStartLoad: true,

        // Bandwidth optimization
        abrEwmaDefaultEstimate: 500000, // 500kbps default
        testBandwidth: false,

        // Enable software AES for compatibility
        enableSoftwareAES: true,
        enableWorker: false,
      });

      hlsRef.current = hls;

      // Load the proxied URL
      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      // Progress tracking
      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        setLoadingStatus("Loading manifest through proxy...");
        setLoadingProgress(40);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setLoadingStatus("Manifest loaded successfully!");
        setLoadingProgress(60);
        console.log(
          "🎥 CORS Bypass: Manifest parsed with",
          data.levels.length,
          "quality levels"
        );
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        setLoadingStatus("Quality level loaded...");
        setLoadingProgress(75);
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        setLoadingStatus("First segment loaded!");
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
          }, 1500);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("🎥 CORS Bypass HLS Error:", data);

        if (data.fatal) {
          isPlayerReady.current = false;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.details === "manifestLoadTimeOut") {
                setLoadingStatus(
                  "Manifest loading timeout, retrying with longer timeout..."
                );
                // Try with a fresh HLS instance with even longer timeouts
                setTimeout(() => {
                  console.log(
                    "🎥 Retrying with fresh HLS instance after timeout..."
                  );
                  hls.destroy();
                  setupHLSWithProxy(); // Retry with new instance
                }, 3000);
              } else {
                setLoadingStatus("Network error through proxy, retrying...");
                setTimeout(() => {
                  console.log("🎥 Retrying after network error...");
                  hls.startLoad();
                }, 2000);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setLoadingStatus("Media error, recovering...");
              hls.recoverMediaError();
              break;
            default:
              setLoadingStatus(`Fatal error: ${data.details}`);
              console.log("🎥 Fatal error, destroying HLS...");
              hls.destroy();
              break;
          }
        } else {
          setLoadingStatus(`Warning: ${data.details}`);
        }
      });

      // Quality switching
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log(`🎥 CORS Bypass: Switched to quality level ${data.level}`);
      });
    };

    // Try direct first (for non-CORS URLs), then fallback to proxy
    const tryDirectFirst = () => {
      setLoadingStatus("Trying direct connection...");
      setLoadingProgress(20);

      // Quick test with a simple fetch
      fetch(videoUrl, {
        method: "HEAD",
        mode: "cors",
      })
        .then((response) => {
          if (response.ok) {
            console.log("🎥 Direct connection successful, using direct URL");
            setLoadingStatus("Direct connection successful!");
            setLoadingProgress(50);

            // Use direct URL if CORS allows it
            const hls = new Hls({
              maxBufferLength: 15,
              startLevel: 0,
              autoStartLoad: true,
              enableSoftwareAES: true,
            });

            hlsRef.current = hls;
            hls.loadSource(videoUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setLoadingProgress(100);
              isPlayerReady.current = true;
              setTimeout(() => setLoadingProgress(0), 1500);
            });
          } else {
            throw new Error("Direct connection failed");
          }
        })
        .catch((error) => {
          console.log(
            "🎥 Direct connection failed, using proxy:",
            error.message
          );
          setupHLSWithProxy();
        });
    };

    // Always use proxy for m3u8 URLs (they usually have CORS issues)
    if (videoUrl.includes(".m3u8")) {
      setupHLSWithProxy();
    } else {
      tryDirectFirst();
    }
  }, [videoUrl]);

  useEffect(() => {
    initializeCORSBypassPlayer();

    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initializeCORSBypassPlayer]);

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
      />

      {/* Loading overlay */}
      {loadingProgress > 0 && loadingProgress < 100 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontFamily: "Arial, sans-serif",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              marginBottom: "20px",
              fontSize: "20px",
              fontWeight: "bold",
            }}
          >
            🚀 CORS Bypass Loading
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "320px",
              height: "8px",
              backgroundColor: "#333",
              borderRadius: "4px",
              marginBottom: "15px",
              overflow: "hidden",
              border: "1px solid #555",
            }}
          >
            <div
              style={{
                width: `${loadingProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #00ff88, #00cc70)",
                transition: "width 0.3s ease",
                borderRadius: "3px",
              }}
            />
          </div>

          <div style={{ fontSize: "14px", marginBottom: "5px" }}>
            {loadingStatus}
          </div>

          <div style={{ fontSize: "12px", opacity: 0.7 }}>
            {loadingProgress}% • Bypassing CORS restrictions
          </div>
        </div>
      )}
    </div>
  );
});

CORSBypassPlayer.displayName = "CORSBypassPlayer";

export default CORSBypassPlayer;
