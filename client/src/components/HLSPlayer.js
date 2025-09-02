import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import Hls from "hls.js";

const HLSPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const isUserAction = useRef(false);
  const syncTimeout = useRef(null);
  const isPlayerReady = useRef(false);

  useImperativeHandle(ref, () => ({
    syncVideo: (data) => {
      if (videoRef.current && !isUserAction.current && isPlayerReady.current) {
        const video = videoRef.current;
        const currentTime = video.currentTime;
        const targetTime = data.currentTime;
        const timeDiff = Math.abs(currentTime - targetTime);

        // Only sync if difference is significant (more than 1 second)
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
      console.log("🎥 HLS getCurrentTime called");
      if (videoRef.current && isPlayerReady.current) {
        const time = videoRef.current.currentTime;
        console.log("🎥 HLS Current time:", time);
        return time;
      }
      console.log("🎥 HLS Player not ready, returning 0");
      return 0;
    },
    getPlayerState: () => {
      console.log("🎥 HLS getPlayerState called");
      if (videoRef.current && isPlayerReady.current) {
        const video = videoRef.current;
        const state = video.paused ? "paused" : "playing";
        console.log("🎥 HLS Player state:", state);
        return state;
      }
      console.log("🎥 HLS Player not ready, returning null");
      return null;
    },
  }));

  const handleVideoEvent = useCallback(
    (action) => {
      if (!isUserAction.current || !isPlayerReady.current) return;

      const currentTime = videoRef.current?.currentTime || 0;

      // Clear any pending sync timeout
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }

      // Debounce the action to avoid spam
      syncTimeout.current = setTimeout(() => {
        onVideoAction(action, currentTime);
        isUserAction.current = false;
      }, 100);
    },
    [onVideoAction]
  );

  const initializeHLS = useCallback(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    console.log("🎥 Starting HLS initialization for:", videoUrl);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
      isPlayerReady.current = false;
    }

    if (Hls.isSupported()) {
      // Use HLS.js for browsers that support it with optimized settings
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: false,
        liveBackBufferLength: 0,
        maxLiveSyncPlaybackRate: 1,
        autoStartLoad: true,
        startPosition: -1,
        debug: false,
        capLevelOnFPSDrop: false,
        capLevelToPlayerSize: false,
        ignoreDevicePixelRatio: false,
        initialLiveManifestSize: 1,
        maxLiveEdgeGap: 10,
        abrEwmaFastLive: 3,
        abrEwmaSlowLive: 9,
        abrEwmaFastVoD: 3,
        abrEwmaSlowVoD: 9,
        abrEwmaDefaultEstimate: 5e5,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: false,
        maxStarvationDelay: 4,
        maxLoadingDelay: 4,
        minAutoBitrate: 0,
        forceKeyFrameOnDiscontinuity: true,
        enableSoftwareAES: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 64000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 64000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 64000,
        startFragPrefetch: false,
        testBandwidth: true,
      });
      hlsRef.current = hls;

      // Add loading indicator
      const loadingIndicator = document.createElement("div");
      loadingIndicator.innerHTML = "Loading video...";
      loadingIndicator.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        background: rgba(0,0,0,0.7);
        padding: 10px 20px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        z-index: 1000;
      `;
      video.parentElement.style.position = "relative";
      video.parentElement.appendChild(loadingIndicator);

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("🎥 HLS media attached");
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log("🎥 HLS manifest loaded successfully", data);
        isPlayerReady.current = true;
        // Remove loading indicator
        if (loadingIndicator.parentElement) {
          loadingIndicator.parentElement.removeChild(loadingIndicator);
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log("🎥 HLS level loaded", data.details.totalduration);
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log("🎥 HLS fragment loaded");
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("🎥 HLS Error:", data);

        // Remove loading indicator on error
        if (loadingIndicator.parentElement) {
          loadingIndicator.parentElement.removeChild(loadingIndicator);
        }

        if (data.fatal) {
          isPlayerReady.current = false;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("🎥 Fatal network error, trying to recover...");
              setTimeout(() => hls.startLoad(), 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("🎥 Fatal media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              console.log("🎥 Fatal error, destroying HLS...");
              hls.destroy();
              // Show error message
              const errorDiv = document.createElement("div");
              errorDiv.innerHTML = "Failed to load video. Please try again.";
              errorDiv.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: red;
                background: rgba(0,0,0,0.8);
                padding: 10px 20px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                z-index: 1000;
              `;
              video.parentElement.appendChild(errorDiv);
              break;
          }
        }
      });

      // Add timeout for loading
      const loadTimeout = setTimeout(() => {
        if (!isPlayerReady.current) {
          console.log("🎥 Loading timeout, trying to start load manually");
          hls.startLoad();
        }
      }, 5000);

      // Clear timeout when ready
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(loadTimeout);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari (native HLS support)
      console.log("🎥 Using native HLS support");
      video.src = videoUrl;
      video.load(); // Force load

      video.addEventListener("loadedmetadata", () => {
        console.log("🎥 Native HLS loaded successfully");
        isPlayerReady.current = true;
      });

      video.addEventListener("error", (e) => {
        console.error("🎥 Native HLS error:", e);
      });
    } else {
      console.error("🎥 HLS not supported in this browser");
    }
  }, [videoUrl]);

  useEffect(() => {
    initializeHLS();

    // Cleanup
    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initializeHLS]);

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

    // User interaction events
    video.addEventListener("click", handleUserInteraction);
    video.addEventListener("keydown", handleUserInteraction);

    // Video events
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
  );
});

HLSPlayer.displayName = "HLSPlayer";

export default HLSPlayer;
