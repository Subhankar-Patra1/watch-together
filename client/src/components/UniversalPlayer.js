import React, { forwardRef } from "react";
import YouTubePlayer from "./YouTubePlayer";
import CORSBypassPlayer from "./CORSBypassPlayer";

// Utility functions for URL detection
const extractYouTubeVideoId = (url) => {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const detectVideoType = (url) => {
  if (!url || typeof url !== "string") return "unknown";

  // YouTube detection
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  }

  // HLS detection
  if (url.includes(".m3u8") || url.includes("m3u8")) {
    return "hls";
  }

  // Direct video file detection
  if (url.match(/\.(mp4|webm|ogg|avi|mov|mkv)(\?.*)?$/i)) {
    return "direct";
  }

  // Default to HLS for unknown streaming URLs
  return "hls";
};

const UniversalPlayer = forwardRef(({ videoData, onVideoAction }, ref) => {
  if (!videoData || !videoData.url) {
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
        }}
      >
        No video selected
      </div>
    );
  }

  const videoType = detectVideoType(videoData.url);

  switch (videoType) {
    case "youtube":
      const videoId = extractYouTubeVideoId(videoData.url);
      if (!videoId) {
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
            }}
          >
            Invalid YouTube URL
          </div>
        );
      }
      return (
        <YouTubePlayer
          ref={ref}
          videoId={videoId}
          onVideoAction={onVideoAction}
        />
      );

    case "hls":
      return (
        <CORSBypassPlayer
          ref={ref}
          videoUrl={videoData.url}
          onVideoAction={onVideoAction}
        />
      );

    case "direct":
      return (
        <CORSBypassPlayer
          ref={ref}
          videoUrl={videoData.url}
          onVideoAction={onVideoAction}
        />
      );

    default:
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
          }}
        >
          Unsupported video format
        </div>
      );
  }
});

UniversalPlayer.displayName = "UniversalPlayer";

// Export utility functions for use in other components
export { detectVideoType, extractYouTubeVideoId };
export default UniversalPlayer;
