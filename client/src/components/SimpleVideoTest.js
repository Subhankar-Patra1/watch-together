import React, { useState, useRef, useEffect } from "react";

const SimpleVideoTest = () => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);

  const startVideo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🎬 Starting simple video test...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: "user",
        },
        audio: true,
      });

      console.log("✅ Got media stream:", mediaStream);
      console.log("Video tracks:", mediaStream.getVideoTracks().length);
      console.log("Audio tracks:", mediaStream.getAudioTracks().length);

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("📹 Set video srcObject");
      }

      setIsLoading(false);
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const stopVideo = () => {
    if (stream) {
      console.log("🛑 Stopping video...");
      stream.getTracks().forEach((track) => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;

      const handleLoadedMetadata = () => {
        console.log("📹 Video metadata loaded");
        video
          .play()
          .then(() => {
            console.log("▶️ Video playing");
          })
          .catch((err) => {
            console.error("❌ Play error:", err);
          });
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, []);

  return (
    <div
      style={{
        padding: "20px",
        background: "#1a1a1a",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2>🧪 Simple Video Test Component</h2>

      <div
        style={{
          width: "400px",
          height: "300px",
          background: "#000",
          border: "2px solid #4ecdc4",
          borderRadius: "8px",
          margin: "20px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(255,255,255,0.3)",
                borderLeft: "4px solid #4ecdc4",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 10px",
              }}
            ></div>
            Loading...
          </div>
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "#ff6b6b",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>❌</div>
            <div>Error: {error}</div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
            display: stream ? "block" : "none",
          }}
          onPlay={() => console.log("📹 onPlay event")}
          onPause={() => console.log("📹 onPause event")}
          onError={(e) => console.error("📹 onError event:", e)}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={startVideo}
          disabled={isLoading || stream}
          style={{
            background: "#4ecdc4",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: stream ? "not-allowed" : "pointer",
            marginRight: "10px",
            opacity: stream ? 0.5 : 1,
          }}
        >
          {isLoading ? "Starting..." : "Start Camera"}
        </button>

        <button
          onClick={stopVideo}
          disabled={!stream}
          style={{
            background: "#e53e3e",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: !stream ? "not-allowed" : "pointer",
            opacity: !stream ? 0.5 : 1,
          }}
        >
          Stop Camera
        </button>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          padding: "15px",
          borderRadius: "8px",
        }}
      >
        <h3>Debug Info:</h3>
        <div>Stream: {stream ? "✅ Active" : "❌ None"}</div>
        <div>Video Tracks: {stream ? stream.getVideoTracks().length : 0}</div>
        <div>Audio Tracks: {stream ? stream.getAudioTracks().length : 0}</div>
        <div>Loading: {isLoading ? "Yes" : "No"}</div>
        <div>Error: {error || "None"}</div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default SimpleVideoTest;
