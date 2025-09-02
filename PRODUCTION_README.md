# Watch Together - Real-time Video Sync Platform

A real-time YouTube and video streaming sync platform with chat functionality.

## Features

- **Multi-format Video Support**: YouTube, HLS (.m3u8), MP4, and other video formats
- **Real-time Synchronization**: Host-controlled video sync across all participants
- **CORS Bypass**: Stream videos from sites with CORS restrictions
- **Group Chat**: Real-time messaging with user colors and reactions
- **Video Calling**: Built-in WebRTC video calling (optional)
- **Room Management**: Create and join rooms with unique codes
- **Host Controls**: Host can control video playback for all participants

## Tech Stack

- **Frontend**: React, Socket.io Client, HLS.js
- **Backend**: Node.js, Express, Socket.io
- **Deployment**: Vercel (Frontend), Render (Backend)

## Production Deployment

### Backend (Render.com)

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use these settings:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: `NODE_ENV=production`

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set build command to use production configuration
3. The frontend will automatically use the production server URL

## Local Development

1. Install dependencies:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

2. Start development servers:

```bash
npm run dev
```

3. Access the application at `http://localhost:3000`

## Environment Configuration

The application automatically configures itself for production:

- Development: Uses `localhost:5000` for the server
- Production: Uses your deployed server URL

## Video Format Support

- **YouTube**: Paste any YouTube URL
- **HLS Streams**: .m3u8 URLs with CORS bypass
- **Direct Videos**: .mp4, .webm, .ogg files
- **CORS Proxy**: Automatic proxy for restricted streaming sites

## Room Features

- Up to 6 users per room
- Host control system
- Persistent rooms (10 minutes after empty)
- Real-time user presence
- Message history (last 100 messages)

## Contributing

Feel free to open issues and pull requests for improvements!
