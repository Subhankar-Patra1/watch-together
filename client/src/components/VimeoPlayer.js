import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';

const VimeoPlayer = forwardRef(({ videoUrl, onVideoAction }, ref) => {
    const playerRef = useRef(null);
    const iframeRef = useRef(null);
    const isUserAction = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useImperativeHandle(ref, () => ({
        syncVideo: (data) => {
            if (playerRef.current && !isUserAction.current) {
                try {
                    // Sync time
                    playerRef.current.setCurrentTime(data.currentTime);

                    // Sync play/pause state
                    if (data.action === 'play') {
                        playerRef.current.play();
                    } else if (data.action === 'pause') {
                        playerRef.current.pause();
                    }
                } catch (error) {
                    console.warn('Vimeo sync error:', error);
                }
            }
        },
        getCurrentTime: async () => {
            if (playerRef.current) {
                try {
                    return await playerRef.current.getCurrentTime();
                } catch (error) {
                    console.warn('Vimeo getCurrentTime error:', error);
                    return 0;
                }
            }
            return 0;
        },
        getPlayerState: async () => {
            if (playerRef.current) {
                try {
                    const paused = await playerRef.current.getPaused();
                    return paused ? 2 : 1; // 1 = playing, 2 = paused
                } catch (error) {
                    console.warn('Vimeo getPlayerState error:', error);
                    return 1;
                }
            }
            return 1;
        }
    }));

    useEffect(() => {
        const loadVimeoPlayer = async () => {
            try {
                // Load Vimeo Player SDK
                if (!window.Vimeo) {
                    const script = document.createElement('script');
                    script.src = 'https://player.vimeo.com/api/player.js';
                    script.onload = initializePlayer;
                    document.head.appendChild(script);
                } else {
                    initializePlayer();
                }
            } catch (error) {
                setError('Failed to load Vimeo player');
                setIsLoading(false);
            }
        };

        const initializePlayer = () => {
            if (!iframeRef.current) return;

            try {
                // Extract Vimeo video ID
                const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
                if (!vimeoId) {
                    setError('Invalid Vimeo URL');
                    setIsLoading(false);
                    return;
                }

                // Create Vimeo player
                playerRef.current = new window.Vimeo.Player(iframeRef.current, {
                    id: vimeoId,
                    width: '100%',
                    height: '100%',
                    responsive: true
                });

                // Set up event listeners
                playerRef.current.on('play', () => {
                    if (isUserAction.current) {
                        playerRef.current.getCurrentTime().then(time => {
                            onVideoAction('play', time);
                        });
                    }
                });

                playerRef.current.on('pause', () => {
                    if (isUserAction.current) {
                        playerRef.current.getCurrentTime().then(time => {
                            onVideoAction('pause', time);
                        });
                    }
                });

                playerRef.current.on('seeked', () => {
                    if (isUserAction.current) {
                        playerRef.current.getCurrentTime().then(time => {
                            onVideoAction('seek', time);
                        });
                    }
                });

                playerRef.current.on('loaded', () => {
                    setIsLoading(false);
                    isUserAction.current = true; // Enable user action tracking
                });

                playerRef.current.on('error', (error) => {
                    setError('Vimeo player error: ' + error.message);
                    setIsLoading(false);
                });

            } catch (error) {
                setError('Failed to initialize Vimeo player');
                setIsLoading(false);
            }
        };

        loadVimeoPlayer();

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        };
    }, [videoUrl, onVideoAction]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
            <div ref={iframeRef} style={{ width: '100%', height: '100%' }} />

            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: '#fff',
                    fontSize: '16px',
                    zIndex: 10,
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #333',
                            borderTop: '3px solid #00adef',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 10px',
                        }} />
                        Loading Vimeo video...
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    color: '#ff6b6b',
                    fontSize: '16px',
                    zIndex: 10,
                    padding: '20px',
                }}>
                    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                            Vimeo Player Error
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
                            {error}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

VimeoPlayer.displayName = 'VimeoPlayer';

export default VimeoPlayer;