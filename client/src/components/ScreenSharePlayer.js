import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import './ScreenSharePlayer.css';

const ScreenSharePlayer = forwardRef(({ videoData, onVideoAction }, ref) => {
  const videoRef = useRef(null);
  const [volume, setVolume] = useState(0.6);
  const [isMuted, setIsMuted] = useState(false);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current ? videoRef.current.currentTime : 0,
    getPlayerState: () => !videoRef.current ? 0 : (videoRef.current.paused ? 2 : 1),
    syncVideo: () => console.log('Screen share sync ignored - live stream')
  }));

  useEffect(() => {
    if (videoRef.current && videoData && videoData.stream) {
      const video = videoRef.current;
      video.srcObject = videoData.stream;
      video.volume = volume;
      video.muted = isMuted;

      const tryPlay = async (muteFallback = true) => {
        try {
          await video.play();
          setTimeout(() => {
            if (!videoRef.current) return;
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
          }, 100);
        } catch (err) {
          if (muteFallback && err.name === 'NotAllowedError') {
            video.muted = true;
            video.play().catch(e => console.error('Play muted failed:', e));
          } else {
            console.error('Screen share play error:', err);
          }
        }
      };
      tryPlay(true);
      const onCanPlay = () => { if (video.paused) tryPlay(false); };
      video.addEventListener('canplay', onCanPlay, { once: true });
      return () => video.removeEventListener('canplay', onCanPlay);
    }
  }, [videoData, volume, isMuted]);

  const handlePlay = () => onVideoAction && onVideoAction('play', videoRef.current?.currentTime || 0);
  const handlePause = () => onVideoAction && onVideoAction('pause', videoRef.current?.currentTime || 0);
  const handleTimeUpdate = () => onVideoAction && onVideoAction('timeupdate', videoRef.current?.currentTime || 0);
  const handleVolumeChange = v => { setVolume(v); if (videoRef.current) videoRef.current.volume = v; };
  const toggleMute = () => { const m = !isMuted; setIsMuted(m); if (videoRef.current) videoRef.current.muted = m; };

  if (!videoData || (!videoData.stream && !videoData.fallbackFrame)) {
    return <div className="screen-share-placeholder"><p>No screen share active</p></div>;
  }

  return (
    <div className="screen-share-player">
      <div className="screen-share-header">
        <span className="screen-share-indicator">🖥️ {videoData.username} is sharing their screen</span>
        <div className="screen-share-controls">
          <button className="volume-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>{isMuted ? '🔇' : '🔊'}</button>
          <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => handleVolumeChange(parseFloat(e.target.value))} className="volume-slider" title="Volume" />
          <span className="volume-text">{Math.round(volume * 100)}%</span>
        </div>
      </div>
      {videoData.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          controls={false}
          className="screen-share-video"
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => { if (videoRef.current) { videoRef.current.volume = volume; videoRef.current.muted = isMuted; } }}
          onError={(e) => console.error('Video error:', e)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        />
      ) : (
        <img
          src={videoData.fallbackFrame}
          alt="Screen share frame"
          className="screen-share-video"
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        />
      )}
    </div>
  );
});

ScreenSharePlayer.displayName = 'ScreenSharePlayer';
export default ScreenSharePlayer;