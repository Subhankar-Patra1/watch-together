# 🎬 WatchTogether - Universal Video Sync Platform

![React](https://img.shields.io/badge/React-18.0+-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-14.0+-green.svg)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.0+-orange.svg)
![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-red.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A comprehensive web platform where multiple users can watch videos together in perfect sync while enjoying rich real-time communication features. Supports YouTube, Vimeo, Dailymotion, X/Twitter, and many more video platforms.

## 🌟 **Project Highlights**

- 🎥 **15+ Video Platforms** supported with intelligent detection
- 🎯 **Perfect Synchronization** for major platforms (YouTube, Vimeo, Dailymotion)
- 📺 **Native Screen Sharing** with audio support and conflict resolution
- 🎤 **High-Quality Voice Chat** with WebRTC peer-to-peer communication
- 💬 **Rich Chat System** with reactions, typing indicators, and presence
- 🎨 **Modern UI/UX** with dark theme, animations, and responsive design
- ⚡ **Performance Optimized** with API caching and smart loading
- 🔧 **Developer Friendly** with comprehensive documentation and debugging

## ✨ Core Features

### 🎥 **Universal Video Support**
- **YouTube** - Full sync with YouTube IFrame API
- **Vimeo** - Complete sync with Vimeo Player API  
- **Dailymotion** - Full sync with Dailymotion SDK
- **X (Twitter)** - Embedded video support with manual sync instructions
- **Direct Video Files** - MP4, WebM, OGG, AVI, MOV, MKV, FLV, WMV, 3GP, M4V
- **Streaming Formats** - HLS (.m3u8), DASH (.mpd) streams
- **Social Platforms** - Facebook, Instagram, TikTok (embedded)
- **Video Platforms** - Twitch, Streamable, Gfycat, Imgur, Reddit videos

### 🎯 **Advanced Synchronization**
- **Perfect Sync** - YouTube, Vimeo, Dailymotion with millisecond precision
- **Smart Sync Detection** - Automatic platform detection and appropriate sync method
- **Manual Sync Instructions** - Clear guidance for platforms without API access
- **Sync Status Indicators** - Visual feedback on sync capabilities
- **Fallback Sync** - Manual sync overlay with countdown for embedded videos

### 📺 **Screen Sharing**
- **Native Screen Sharing** - Browser-based screen capture with audio
- **Conflict Resolution** - Smart popup system when switching between content types
- **Audio Controls** - Volume adjustment and echo cancellation
- **Main Video Integration** - Screen shares display in the main video area
- **Multi-user Support** - Handle multiple screen share requests gracefully

### 💬 **Enhanced Chat System**
- **Real-time Messaging** - Instant message delivery with WebSocket
- **Rich User Presence** - Color-coded usernames, online indicators, typing status
- **Message Features** - Timestamps, message sizing, system notifications
- **Emoji Reactions** - 8 animated floating emoji reactions
- **Typing Indicators** - Smart typing detection with user names and colors
- **Message History** - Persistent chat during session

### 🎤 **Voice Communication**
- **Voice Chat** - High-quality peer-to-peer voice communication
- **Voice Controls** - Mute/unmute, volume adjustment
- **Voice Status** - Visual indicators for active voice participants
- **Voice Notifications** - Join requests and status updates
- **Multi-user Voice** - Support for multiple participants

### 🏠 **Room Management**
- **Room Creation** - Generate unique 6-character room codes
- **User Limits** - Support for multiple users (configurable)
- **Host Controls** - Video selection, playback control, user management
- **Host Transfer** - Transfer host privileges to other users
- **Room Persistence** - Rooms stay active with automatic cleanup
- **User Authentication** - Username-based identification with color coding

### 🎨 **User Interface & Experience**
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Dark Theme** - Modern dark UI with custom scrollbars
- **Resizable Panels** - Adjustable video and chat sections
- **Loading States** - Smooth loading indicators and error handling
- **Animations** - Framer Motion animations for reactions and transitions
- **Accessibility** - Keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd watchtogether
npm install
```

2. **Install server dependencies:**
```bash
cd server
npm install
cd ..
```

3. **Install client dependencies:**
```bash
cd client
npm install
cd ..
```

### Running the Application

**Option 1: Run both server and client together (recommended)**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 (Server):
```bash
cd server
npm run dev
```

Terminal 2 (Client):
```bash
cd client
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

## 🎮 How to Use

### 🏠 **Room Management**
1. **Create a Room**:
   - Enter your username (3-20 characters)
   - Click "Create New Room"
   - Share the generated 6-character room code with friends
   - You become the host with control privileges

2. **Join a Room**:
   - Enter your username and the room code
   - Click "Join Room"
   - You'll see other users and can participate in chat

### 🎥 **Video Watching**
3. **Add Videos** (Host only):
   - Paste any supported video URL in the input field
   - Supported platforms: YouTube, Vimeo, Dailymotion, X/Twitter, direct files
   - Click "Set Video" to load for all users
   - Videos automatically sync across all participants

4. **Playback Control**:
   - **YouTube/Vimeo/Dailymotion**: Perfect automatic sync
   - **X/Twitter/Embedded**: Manual sync instructions appear
   - Use "Sync All" button to resynchronize if needed
   - Host controls affect all users simultaneously

### 📺 **Screen Sharing**
5. **Share Your Screen**:
   - Click "Share Screen" button
   - Select window/screen in browser dialog
   - Choose to include audio if needed
   - Screen appears in main video area for all users
   - Conflict resolution if video is already playing

### 💬 **Communication**
6. **Chat Features**:
   - Type messages in the chat area
   - Send emoji reactions with the emoji bar
   - See typing indicators and user presence
   - Messages show timestamps and user colors

7. **Voice Chat**:
   - Click the microphone icon to start voice chat
   - Other users get notification to join
   - Mute/unmute and adjust volume as needed
   - See voice status indicators for active participants

### 🎛️ **Advanced Features**
8. **Panel Management**:
   - Drag the panel divider to resize video/chat areas
   - Switch between chat and video call views
   - Responsive design adapts to your screen size

9. **Host Controls**:
   - Transfer host privileges to other users
   - Control video playback for the room
   - Manage screen sharing conflicts
   - Set videos and manage room settings

## 🛠 Tech Stack

### Frontend
- **React** - Modern UI framework with hooks
- **Socket.IO Client** - Real-time bidirectional communication
- **Framer Motion** - Smooth animations and transitions
- **YouTube IFrame API** - YouTube video control and synchronization
- **Vimeo Player API** - Vimeo video integration and sync
- **Dailymotion SDK** - Dailymotion video player integration
- **WebRTC** - Peer-to-peer voice chat and screen sharing
- **CSS3** - Custom styling with dark theme and responsive design

### Backend
- **Node.js + Express** - High-performance server framework
- **Socket.IO** - WebSocket server for real-time events
- **UUID** - Unique room and user ID generation
- **CORS** - Cross-origin resource sharing configuration
- **Express Rate Limiting** - API protection and abuse prevention

### APIs & Integrations
- **YouTube Data API** - Video information and embedding
- **Vimeo Player API** - Vimeo video control
- **Dailymotion Cloud SDK** - Dailymotion integration
- **Twitter/X Embed API** - Social media video embedding
- **Browser APIs** - Screen Capture, WebRTC, MediaDevices

## 📁 Project Structure

```
watchtogether/
├── client/                          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.js      # Home page with room creation/joining
│   │   │   ├── RoomPage.js         # Main room interface
│   │   │   ├── UniversalPlayer.js  # Smart video player with platform detection
│   │   │   ├── YouTubePlayer.js    # YouTube-specific player with full sync
│   │   │   ├── VimeoPlayer.js      # Vimeo player with API integration
│   │   │   ├── DailymotionPlayer.js # Dailymotion player with SDK
│   │   │   ├── EmbedVideoPlayer.js # Generic embedded video player
│   │   │   ├── SyncFallbackPlayer.js # Manual sync for unsupported platforms
│   │   │   ├── GenericVideoPlayer.js # Direct video file player
│   │   │   ├── CORSBypassPlayer.js # HLS/DASH stream player
│   │   │   ├── ScreenShare.js      # Screen sharing functionality
│   │   │   ├── ScreenShareModal.js # Screen share conflict resolution
│   │   │   ├── ScreenSharePlayer.js # Screen share video display
│   │   │   ├── GroupChatSection.js # Enhanced chat with voice integration
│   │   │   ├── VideoCallSection.js # Video call interface
│   │   │   ├── VoiceChat.js        # Voice communication system
│   │   │   ├── VoiceChatStatus.js  # Voice chat status indicators
│   │   │   ├── FloatingReactions.js # Animated emoji reactions
│   │   │   ├── ResizablePanel.js   # Draggable panel resizing
│   │   │   ├── SyncStatusIndicator.js # Sync capability indicators
│   │   │   └── TwitterVideoDemo.js # X/Twitter testing component
│   │   ├── utils/
│   │   │   ├── youtubeAPI.js       # YouTube API optimization and caching
│   │   │   └── twitterUtils.js     # X/Twitter URL processing utilities
│   │   ├── docs/
│   │   │   └── twitter-video-support.md # X/Twitter integration docs
│   │   ├── App.js                  # Main application component
│   │   ├── App.css                 # Comprehensive styling with dark theme
│   │   └── index.js                # Application entry point
│   └── package.json
├── server/                          # Node.js backend server
│   ├── index.js                    # Express server with Socket.IO
│   └── package.json
├── package.json                    # Root package.json with dev scripts
├── README.md                       # This comprehensive documentation
└── Documentation Files/            # Feature-specific documentation
    ├── VOICE_CHAT_DOCUMENTATION.md
    ├── screen-share-fix-summary.md
    ├── universal-video-support.md
    └── youtube-performance-optimization.md
```

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` files for custom configuration:

**server/.env**:
```
PORT=5000
CLIENT_URL=http://localhost:3000
```

**client/.env**:
```
REACT_APP_SERVER_URL=http://localhost:5000
```

## 🚀 Deployment

### Frontend (Vercel)
1. Build the client: `cd client && npm run build`
2. Deploy the `client/build` folder to Vercel
3. Update the server URL in the client code

### Backend (Render/Heroku)
1. Deploy the `server` folder
2. Set environment variables:
   - `PORT` (automatically set by most platforms)
   - `CLIENT_URL` (your frontend URL)

### Database (Future Enhancement)
Currently uses in-memory storage. For production, consider:
- MongoDB Atlas for persistent room data
- Redis for session management

## 🎯 Supported Video Platforms

### ✅ **Full Sync Support** (Perfect synchronization)
- **YouTube** - All public videos, playlists, live streams
- **Vimeo** - Public and unlisted videos
- **Dailymotion** - Public videos and channels
- **Direct Video Files** - MP4, WebM, OGG, AVI, MOV, MKV, FLV, WMV, 3GP, M4V
- **Streaming Formats** - HLS (.m3u8), DASH (.mpd)

### ⚠️ **Manual Sync Support** (Embedded with instructions)
- **X (Twitter)** - Tweet videos and GIFs
- **Facebook** - Public video posts (limited by privacy settings)
- **Instagram** - Public video posts and reels (limited)
- **TikTok** - Public videos (limited by platform restrictions)
- **Twitch** - VODs and clips
- **Streamable** - Video hosting platform
- **Gfycat** - GIF and video content
- **Imgur** - Video content
- **Reddit** - v.redd.it videos

### 📱 **URL Format Examples**
```
YouTube: https://www.youtube.com/watch?v=VIDEO_ID
         https://youtu.be/VIDEO_ID

Vimeo:   https://vimeo.com/VIDEO_ID

Dailymotion: https://www.dailymotion.com/video/VIDEO_ID

X/Twitter: https://twitter.com/user/status/TWEET_ID
          https://x.com/user/status/TWEET_ID

Direct:  https://example.com/video.mp4
         https://example.com/stream.m3u8
```

## 🚀 Advanced Features

### 🎛️ **Performance Optimizations**
- **YouTube API Caching** - Global API loader with smart caching
- **Player Reuse** - Efficient player instance management  
- **Lazy Loading** - Components load only when needed
- **Error Recovery** - Automatic fallback and retry mechanisms
- **Memory Management** - Proper cleanup and garbage collection

### 🔧 **Developer Features**
- **Debug Logging** - Comprehensive console logging for troubleshooting
- **Error Boundaries** - Graceful error handling and recovery
- **Hot Reloading** - Development server with instant updates
- **Code Splitting** - Optimized bundle sizes
- **TypeScript Ready** - Easy migration path to TypeScript

### 🎨 **UI/UX Enhancements**
- **Dark Theme** - Modern dark interface with custom scrollbars
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Loading States** - Smooth loading indicators and skeletons
- **Error Messages** - User-friendly error descriptions and solutions
- **Accessibility** - Keyboard navigation and screen reader support
- **Animations** - Smooth transitions and micro-interactions

## 🎯 Future Roadmap

### 🔜 **Planned Features**
- [ ] **Playlist Management** - Create and share video queues
- [ ] **User Accounts** - Persistent profiles and room history
- [ ] **Private Rooms** - Password-protected and invite-only rooms
- [ ] **Mobile App** - React Native mobile application
- [ ] **Video Annotations** - Timestamp comments and bookmarks
- [ ] **Advanced Chat** - File sharing, voice messages, translations
- [ ] **Room Templates** - Pre-configured room types (movie night, study session)
- [ ] **Analytics** - Watch time statistics and engagement metrics

### 🔮 **Future Enhancements**
- [ ] **Multi-language Support** - Internationalization (i18n)
- [ ] **Database Integration** - MongoDB/PostgreSQL for persistence
- [ ] **User Authentication** - OAuth integration (Google, GitHub, Discord)
- [ ] **Video Filters** - Brightness, contrast, playback speed controls
- [ ] **Picture-in-Picture** - Floating video player mode
- [ ] **Virtual Reality** - VR/360° video support
- [ ] **AI Features** - Content recommendations and auto-moderation

## 🐛 Troubleshooting

### **Common Issues & Solutions**

#### 🔗 **Connection Issues**
- **CORS Errors**: Ensure both client (port 3000) and server (port 5000) are running
- **WebSocket Failures**: Check firewall settings and proxy configurations
- **Room Not Found**: Verify the 6-character room code is correct and case-sensitive

#### 🎥 **Video Playback Issues**
- **YouTube Videos Not Loading**: 
  - Verify the video is public and not region-restricted
  - Check if YouTube API quotas are exceeded
  - Try refreshing the page to reload the API
- **Vimeo/Dailymotion Issues**:
  - Ensure videos are public or unlisted (not private)
  - Check if the platform's API is accessible
- **X/Twitter Videos**:
  - Verify the tweet is public and contains video content
  - Private or deleted tweets cannot be embedded
- **Direct Video Files**:
  - Ensure the video URL is directly accessible
  - Check CORS headers on the video server

#### 🎯 **Synchronization Problems**
- **Sync Drift**: Use the "Sync All" button to resynchronize
- **Manual Sync Instructions**: Follow the countdown overlay for embedded videos
- **Platform Limitations**: Some platforms don't support automatic sync

#### 🎤 **Voice Chat Issues**
- **Microphone Access**: Grant microphone permissions in browser
- **Audio Quality**: Check microphone settings and background noise
- **Connection Problems**: Ensure WebRTC isn't blocked by network

#### 📺 **Screen Sharing Problems**
- **Screen Capture Access**: Grant screen sharing permissions
- **Audio Not Sharing**: Select "Share audio" in the browser dialog
- **Performance Issues**: Close unnecessary applications to improve performance

### **Browser Compatibility**
- **Recommended**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **WebRTC Support**: Required for voice chat and screen sharing
- **Modern JavaScript**: ES6+ features required

### **Performance Tips**
- **Close Unused Tabs**: Reduce browser memory usage
- **Stable Internet**: Ensure good connection for all participants
- **Hardware Acceleration**: Enable in browser settings for better video performance
- **Ad Blockers**: May interfere with video embedding, consider whitelisting

### **Debug Information**
Enable browser developer tools (F12) to see detailed logs:
```javascript
// Check console for debug messages starting with:
🎬 // Video player logs
🔔 // Voice chat logs  
🎯 // Sync operation logs
⚠️ // Error and warning logs
```

## 📝 License

MIT License - feel free to use this project for learning or building your own version!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📊 **Project Statistics**

- **Components**: 20+ React components with specialized functionality
- **Video Platforms**: 15+ supported platforms with smart detection
- **Real-time Features**: Chat, voice, screen sharing, synchronization
- **API Integrations**: YouTube, Vimeo, Dailymotion, Twitter/X embed APIs
- **Browser APIs**: WebRTC, Screen Capture, MediaDevices, WebSocket
- **Performance**: Optimized loading, caching, and memory management
- **Accessibility**: Keyboard navigation, screen reader support, responsive design

## 🏆 **Key Achievements**

✅ **Universal Video Support** - First platform to support 15+ video sources with intelligent sync  
✅ **Perfect Synchronization** - Millisecond-precise sync for major platforms  
✅ **Native Screen Sharing** - Browser-based screen capture with audio and conflict resolution  
✅ **Advanced Voice Chat** - WebRTC implementation with quality controls  
✅ **Smart Fallback System** - Manual sync instructions for unsupported platforms  
✅ **Performance Optimization** - Global API caching and efficient resource management  
✅ **Modern Architecture** - Component-based design with real-time communication  
✅ **Developer Experience** - Comprehensive documentation and debugging tools  

## 🎉 **Ready to Watch Together?**

This platform represents a complete solution for synchronized video watching with friends, featuring cutting-edge web technologies and a user-friendly interface. Whether you're hosting a movie night, studying together, or sharing content, WatchTogether provides the tools you need for a seamless shared viewing experience.

---

**Start watching together today! 🍿✨**

*Built with ❤️ using React, Node.js, and modern web technologies*