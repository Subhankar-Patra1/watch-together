import React, { forwardRef } from "react";
import YouTubePlayer from "./YouTubePlayer";
import CORSBypassPlayer from "./CORSBypassPlayer";
import ScreenSharePlayer from "./ScreenSharePlayer";
import GenericVideoPlayer from "./GenericVideoPlayer";
import EmbedVideoPlayer from "./EmbedVideoPlayer";
import VimeoPlayer from "./VimeoPlayer";
import DailymotionPlayer from "./DailymotionPlayer";
import SyncFallbackPlayer from "./SyncFallbackPlayer";
import { isTwitterUrl } from "../utils/twitterUtils";

// Utility functions for URL detection
const extractYouTubeVideoId = (url) => {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const detectVideoType = (videoData) => {
  // Handle screen share types
  if (videoData && videoData.type === 'screen-share') {
    return 'screen-share';
  }
  
  if (videoData && videoData.type === 'screen-share-remote') {
    return 'screen-share-remote';
  }

  const url = videoData?.url || videoData;
  console.log('🎬 Detecting video type for URL:', url);
  
  if (!url || typeof url !== "string") {
    console.log('🎬 Invalid URL data:', videoData);
    return "unknown";
  }

  // YouTube detection
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  }

  // Vimeo detection
  if (url.includes("vimeo.com")) {
    return "vimeo";
  }

  // Dailymotion detection
  if (url.includes("dailymotion.com") || url.includes("dai.ly")) {
    return "dailymotion";
  }

  // Twitch detection
  if (url.includes("twitch.tv")) {
    return "twitch";
  }

  // Facebook Video detection
  if (url.includes("facebook.com") && (url.includes("/videos/") || url.includes("/share/v/") || url.includes("/watch/"))) {
    console.log('🎬 Detected Facebook video');
    return "facebook";
  }

  // Instagram Video detection
  if (url.includes("instagram.com") && (url.includes("/p/") || url.includes("/reel/"))) {
    return "instagram";
  }

  // TikTok detection
  if (url.includes("tiktok.com")) {
    return "tiktok";
  }

  // X (Twitter) detection - using utility function for better accuracy
  if (isTwitterUrl(url)) {
    console.log('🎬 Detected X/Twitter video');
    return "twitter";
  }

  // HLS detection (.m3u8 streams)
  if (url.includes(".m3u8") || url.includes("m3u8")) {
    return "hls";
  }

  // DASH detection (.mpd streams)
  if (url.includes(".mpd") || url.includes("mpd")) {
    return "dash";
  }

  // Direct video file detection
  if (url.match(/\.(mp4|webm|ogg|avi|mov|mkv|flv|wmv|3gp|m4v)(\?.*)?$/i)) {
    return "direct";
  }

  // Streaming platforms detection
  if (url.includes("streamable.com") || 
      url.includes("streamja.com") || 
      url.includes("gfycat.com") ||
      url.includes("imgur.com") ||
      url.includes("reddit.com") ||
      url.includes("v.redd.it")) {
    return "embed";
  }

  // Generic video streaming detection
  if (url.includes("stream") || 
      url.includes("video") || 
      url.includes("watch") ||
      url.includes("play")) {
    return "generic";
  }

  // Default to generic for unknown URLs
  console.log('🎬 Defaulting to generic video type');
  return "generic";
};

const UniversalPlayer = forwardRef(({ videoData, onVideoAction }, ref) => {


  // Check if we have valid video data
  if (!videoData) {
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

  // For screen share, we don't need a URL, we need a stream
  if (videoData.type === 'screen-share') {
    if (!videoData.stream) {
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
          Screen share stream not available
        </div>
      );
    }
  } else if (!videoData.url) {
    // For other video types, we need a URL
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

  const videoType = detectVideoType(videoData);

  switch (videoType) {
    case "screen-share":
      // Check if it's a remote screen share or local
      if (videoData.isRemote || videoData.socketId) {
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            <div style={{ fontSize: "48px" }}>🖥️</div>
            <div style={{ fontSize: "18px", textAlign: "center" }}>
              {videoData.username} is sharing their screen
            </div>
            <div style={{ fontSize: "14px", opacity: 0.7, textAlign: "center" }}>
              Screen sharing is active
            </div>
          </div>
        );
      } else {
        // Local screen share with actual stream
        return (
          <ScreenSharePlayer
            key={`screen-share-${videoData.username}`}
            ref={ref}
            videoData={videoData}
            onVideoAction={onVideoAction}
          />
        );
      }
    
    case "screen-share-remote":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexDirection: "column",
            gap: "20px"
          }}
        >
          <div style={{ fontSize: "48px" }}>🖥️</div>
          <div style={{ fontSize: "18px", textAlign: "center" }}>
            {videoData.message || `${videoData.username} is sharing their screen`}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.7, textAlign: "center" }}>
            Waiting for screen share connection...
          </div>
        </div>
      );
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
          key={`youtube-${videoId}`}
          ref={ref}
          videoId={videoId}
          onVideoAction={onVideoAction}
        />
      );

    case "vimeo":
      return (
        <VimeoPlayer
          key={`vimeo-${videoData.url}`}
          ref={ref}
          videoUrl={videoData.url}
          onVideoAction={onVideoAction}
        />
      );

    case "dailymotion":
      return (
        <DailymotionPlayer
          key={`dailymotion-${videoData.url}`}
          ref={ref}
          videoUrl={videoData.url}
          onVideoAction={onVideoAction}
        />
      );

    case "twitch":
    case "twitter":
    case "embed":
      return (
        <SyncFallbackPlayer
          key={`sync-fallback-${videoData.url}`}
          ref={ref}
          videoUrl={videoData.url}
          onVideoAction={onVideoAction}
        />
      );

    case "hls":
      return (
        <CORSBypassPlayer
          key={`hls-${videoData.url}`}
          ref={ref}
          videoUrl={videoData.url}
          onVideoAction={onVideoAction}
        />
      );

    case "dash":
    case "direct":
    case "generic":
      return (
        <GenericVideoPlayer
          key={`generic-${videoData.url}`}
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
