import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import HLSPlayer from "./HLSPlayer";

const SmartVideoPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
  const [loadingMethod, setLoadingMethod] = useState("direct"); // "direct" or "hls"
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);
  const timeoutRef = useRef(null);

  useImperativeHandle(ref, () => ({
    syncVideo: (data) => {
      if (loadingMethod === "hls" && videoRef.current?.syncVideo) {
        videoRef.current.syncVideo(data);
      } else if (videoRef.current && loadingMethod === "direct") {
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
      if (loadingMethod === "hls" && videoRef.current?.getCurrentTime) {
        return videoRef.current.getCurrentTime();
      } else if (videoRef.current && loadingMethod === "direct") {
        return videoRef.current.currentTime || 0;
      }
      return 0;
    },
    getPlayerState: () => {
      if (loadingMethod === "hls" && videoRef.current?.getPlayerState) {
        return videoRef.current.getPlayerState();
      } else if (videoRef.current && loadingMethod === "direct") {
        return videoRef.current.paused ? "paused" : "playing";
      }
      return null;
    },
  }));

  useEffect(() => {
    setIsLoading(true);
    setLoadingMethod("direct");

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Try direct loading first with a timeout
    timeoutRef.current = setTimeout(() => {
      if (isLoading && loadingMethod === "direct") {
        console.log("🎥 Direct loading timed out, switching to HLS");
        setLoadingMethod("hls");
      }
    }, 3000); // 3 second timeout for direct loading

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [videoUrl, isLoading, loadingMethod]);

  const handleDirectVideoLoad = () => {
    console.log("🎥 Direct video loaded successfully");
    setIsLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleDirectVideoError = (e) => {
    console.log("🎥 Direct video failed, switching to HLS:", e);
    setLoadingMethod("hls");
  };

  const handleDirectVideoCanPlay = () => {
    console.log("🎥 Direct video can play");
    setIsLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleHLSPlayerReady = () => {
    setIsLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Show loading indicator
  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          position: "relative",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            background: "rgba(0,0,0,0.8)",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #333",
              borderTop: "4px solid #fff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 10px",
            }}
          />
          <div>
            Loading video... (
            {loadingMethod === "direct" ? "Trying direct" : "Using HLS"})
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Try direct video loading first
  if (loadingMethod === "direct") {
    return (
      <video
        ref={videoRef}
        controls
        src={videoUrl}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
        }}
        preload="auto"
        crossOrigin="anonymous"
        playsInline
        onLoadedData={handleDirectVideoLoad}
        onCanPlay={handleDirectVideoCanPlay}
        onError={handleDirectVideoError}
        onPlay={(e) => onVideoAction("play", e.target.currentTime)}
        onPause={(e) => onVideoAction("pause", e.target.currentTime)}
        onSeeked={(e) => onVideoAction("seek", e.target.currentTime)}
      />
    );
  }

  // Fall back to HLS player
  return (
    <HLSPlayer
      ref={videoRef}
      videoUrl={videoUrl}
      onVideoAction={onVideoAction}
      onReady={handleHLSPlayerReady}
    />
  );
});

SmartVideoPlayer.displayName = "SmartVideoPlayer";

export default SmartVideoPlayer;
