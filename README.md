# 🎬 WatchTogether - Real-Time YouTube Sync Platform

A web platform where up to 6 people can watch YouTube videos together in perfect sync while chatting in real-time.

## ✨ Features

- **Room Creation & Joining**: Create rooms with unique codes, invite up to 6 friends
- **YouTube Video Sync**: Perfect synchronization of play/pause/seek across all users
- **Real-Time Chat**: Group chat with usernames, timestamps, and typing indicators
- **Emoji Reactions**: Send animated floating emoji reactions
- **User Presence**: See who's online with color-coded usernames
- **Host Controls**: Room creator controls video selection and playback

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

1. **Create a Room**:
   - Enter your username
   - Click "Create New Room"
   - Share the generated room code with friends

2. **Join a Room**:
   - Enter your username and room code
   - Click "Join Room"

3. **Watch Together**:
   - Host pastes a YouTube URL to set the video
   - All users see synchronized playback
   - Chat and react in real-time!

## 🛠 Tech Stack

### Frontend
- **React** - UI framework
- **Socket.IO Client** - Real-time communication
- **Framer Motion** - Animations for reactions
- **YouTube IFrame API** - Video embedding and control

### Backend
- **Node.js + Express** - Server framework
- **Socket.IO** - WebSocket communication
- **UUID** - Unique ID generation

## 📁 Project Structure

```
watchtogether/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.js
│   │   │   ├── RoomPage.js
│   │   │   ├── YouTubePlayer.js
│   │   │   ├── ChatSection.js
│   │   │   └── FloatingReactions.js
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js
│   └── package.json
├── package.json           # Root package.json
└── README.md
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

## 🎯 Features Roadmap

- [ ] Private/password-protected rooms
- [ ] Video queue/playlist functionality
- [ ] Voice chat integration
- [ ] Mobile app (React Native)
- [ ] Custom emoji packs
- [ ] Room persistence with database
- [ ] User accounts and room history

## 🐛 Troubleshooting

**Common Issues:**

1. **CORS Errors**: Make sure both client and server are running on correct ports
2. **YouTube Videos Not Loading**: Check if the YouTube URL is valid and public
3. **Sync Issues**: Refresh the page if video sync gets out of order
4. **Connection Issues**: Ensure WebSocket connections aren't blocked by firewall

## 📝 License

MIT License - feel free to use this project for learning or building your own version!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Enjoy watching together! 🍿**