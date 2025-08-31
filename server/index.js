const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? function (origin, callback) {
        console.log(`CORS check for origin: ${origin}`);

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) {
          console.log("Allowing request with no origin");
          return callback(null, true);
        }

        // Allow all localhost and vercel.app domains
        if (origin.includes("localhost") || origin.includes(".vercel.app")) {
          console.log("Allowing origin:", origin);
          callback(null, true);
        } else {
          console.log("Blocking origin:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      }
    : ["http://localhost:3000", "http://localhost:3001"];

// Socket.IO needs a simpler CORS configuration
const socketIoAllowedOrigins =
  process.env.NODE_ENV === "production"
    ? true // Allow all origins for now to test
    : ["http://localhost:3000", "http://localhost:3001"];

const io = socketIo(server, {
  cors: {
    origin: socketIoAllowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// Store room data in memory (use Redis/MongoDB for production)
const rooms = new Map();

// Generate unique room code
function generateRoomCode() {
  // Use timestamp and random for better uniqueness
  const timestamp = Date.now().toString(36).slice(-2);
  const random = Math.random().toString(36).substring(2, 6);
  return (timestamp + random).toUpperCase().substring(0, 6);
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

app.post("/api/create-room", (req, res) => {
  console.log("=== CREATE ROOM REQUEST ===");
  console.log("Headers:", req.headers);
  console.log("Origin:", req.headers.origin);
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  try {
    const roomCode = generateRoomCode();
    console.log(`Creating room with code: ${roomCode}`);

    // Ensure room code is unique
    let attempts = 0;
    let finalRoomCode = roomCode;
    while (rooms.has(finalRoomCode) && attempts < 10) {
      finalRoomCode = generateRoomCode();
      attempts++;
    }

    if (attempts >= 10) {
      console.error("Could not generate unique room code after 10 attempts");
      return res
        .status(500)
        .json({ error: "Failed to generate unique room code" });
    }

    rooms.set(finalRoomCode, {
      id: finalRoomCode,
      users: [],
      video: null,
      videoState: {
        isPlaying: false,
        currentTime: 0,
        lastUpdate: Date.now(),
      },
      messages: [],
      host: null,
      emptyTimestamp: null,
    });

    console.log(`Room ${finalRoomCode} created successfully`);
    console.log(`Total rooms now:`, rooms.size);
    console.log(`All room codes:`, Array.from(rooms.keys()));
    console.log(`New room state:`, {
      id: finalRoomCode,
      users: [],
      hasUsers: false,
      userCount: 0
    });
    const response = { roomCode: finalRoomCode };
    console.log("Sending response:", response);
    res.json(response);
  } catch (error) {
    console.error("Error creating room:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  console.log("Test endpoint hit");
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/room/:roomCode", (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json({
    roomCode,
    userCount: room.users.length,
    hasVideo: !!room.video,
  });
});

// Debug endpoint to list all rooms
app.get("/api/debug/rooms", (req, res) => {
  const roomsInfo = Array.from(rooms.entries()).map(([code, room]) => ({
    roomCode: code,
    userCount: room.users.length,
    users: room.users.map(u => ({ id: u.id, username: u.username })),
    hasVideo: !!room.video,
    emptyTimestamp: room.emptyTimestamp,
  }));
  
  res.json({
    totalRooms: rooms.size,
    rooms: roomsInfo,
    timestamp: new Date().toISOString(),
  });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomCode, username }) => {
    console.log(`User ${username} attempting to join room ${roomCode}`);
    console.log(`Available rooms:`, Array.from(rooms.keys()));
    console.log(`Room exists:`, rooms.has(roomCode));
    const room = rooms.get(roomCode);

    if (!room) {
      console.log(`ERROR: Room ${roomCode} not found`);
      console.log(`Available rooms: [${Array.from(rooms.keys()).join(', ')}]`);
      console.log(`Total rooms in memory: ${rooms.size}`);
      socket.emit("error", { 
        message: "Room not found",
        details: `Room ${roomCode} does not exist. Available rooms: ${rooms.size}`,
        availableRooms: Array.from(rooms.keys()),
        requestedRoom: roomCode
      });
      return;
    }

    console.log(`Room ${roomCode} found with ${room.users.length} users`);

    if (room.users.length >= 6) {
      console.log(`ERROR: Room ${roomCode} is full (${room.users.length}/6)`);
      socket.emit("error", { 
        message: "Room is full",
        details: `Room ${roomCode} has ${room.users.length}/6 users`,
        currentUsers: room.users.map(u => u.username)
      });
      return;
    }

    // Check if username is already taken
    if (room.users.some((user) => user.username === username)) {
      console.log(`ERROR: Username ${username} already taken in room ${roomCode}`);
      console.log(`Existing users: ${room.users.map(u => u.username).join(', ')}`);
      socket.emit("error", { 
        message: "Username already taken",
        details: `Username "${username}" is already in use in room ${roomCode}`,
        existingUsers: room.users.map(u => u.username)
      });
      return;
    }

    console.log(`User ${username} validation passed for room ${roomCode}`);

    // Generate a vibrant, distinct color for the user
    const predefinedColors = [
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#96CEB4", // Green
      "#FFEAA7", // Yellow
      "#DDA0DD", // Plum
      "#98D8C8", // Mint
      "#F7DC6F", // Light Yellow
      "#BB8FCE", // Light Purple
      "#85C1E9", // Light Blue
      "#F8C471", // Orange
      "#82E0AA", // Light Green
    ];

    // Use predefined colors first, then generate random ones
    const colorIndex = room.users.length % predefinedColors.length;
    const userColor =
      room.users.length < predefinedColors.length
        ? predefinedColors[colorIndex]
        : `hsl(${Math.floor(Math.random() * 360)}, 75%, 60%)`;

    const user = {
      id: socket.id,
      username,
      color: userColor,
    };

    room.users.push(user);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.username = username;

    // Clear empty timestamp since room is no longer empty
    room.emptyTimestamp = null;

    // Set host if first user
    if (!room.host) {
      room.host = socket.id;
      socket.emit("host-status", { isHost: true });
    }

    // Send room state to new user
    socket.emit("room-joined", {
      roomCode,
      users: room.users,
      video: room.video,
      videoState: room.videoState,
      messages: room.messages.slice(-50), // Last 50 messages
      isHost: room.host === socket.id,
    });

    // Send video call state if it exists

    // If there's a video playing, send initial sync after a delay to ensure player is ready
    if (room.video && room.videoState) {
      setTimeout(() => {
        const timeSinceUpdate =
          (Date.now() - room.videoState.lastUpdate) / 1000;
        const currentTime = room.videoState.isPlaying
          ? room.videoState.currentTime + timeSinceUpdate
          : room.videoState.currentTime;

        socket.emit("initial-video-sync", {
          action: room.videoState.isPlaying ? "play" : "pause",
          currentTime: currentTime,
          timestamp: Date.now(),
        });
      }, 2000); // Give more time for the YouTube player to initialize
    }

    // Notify others about the new user
    socket.to(roomCode).emit("user-joined", { user });

    // Send updated user list to ALL users in the room (including the new user)
    io.to(roomCode).emit("users-updated", { users: room.users });
  });

  socket.on("set-video", (videoData) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only host can set video" });
      return;
    }

    let processedVideoData;

    if (videoData.type === "local") {
      // Local file
      processedVideoData = {
        type: "local",
        url: videoData.url,
        filename: videoData.filename,
        duration: videoData.duration,
      };
    } else if (videoData.type === "youtube") {
      // YouTube video
      processedVideoData = {
        type: "youtube",
        videoId: videoData.videoId,
        url: videoData.url,
      };
    } else if (typeof videoData === "string" || videoData.videoUrl) {
      // Backward compatibility for old format
      const videoUrl = videoData.videoUrl || videoData;
      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        socket.emit("error", { message: "Invalid YouTube URL" });
        return;
      }
      processedVideoData = {
        type: "youtube",
        videoId: videoId,
        url: videoUrl,
        // Legacy format for backward compatibility
        id: videoId,
      };
    } else {
      socket.emit("error", { message: "Invalid video data" });
      return;
    }

    room.video = processedVideoData;

    room.videoState = {
      isPlaying: false,
      currentTime: 0,
      lastUpdate: Date.now(),
    };

    io.to(roomCode).emit("video-set", { video: room.video });
    console.log(`Video set in room ${roomCode}:`, processedVideoData);
  });

  socket.on("video-action", ({ action, currentTime }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) return;

    room.videoState.currentTime = currentTime || room.videoState.currentTime;
    room.videoState.lastUpdate = Date.now();

    switch (action) {
      case "play":
        room.videoState.isPlaying = true;
        break;
      case "pause":
        room.videoState.isPlaying = false;
        break;
      case "seek":
        room.videoState.currentTime = currentTime;
        break;
    }

    socket.to(roomCode).emit("video-sync", {
      action,
      currentTime: room.videoState.currentTime,
      isPlaying: room.videoState.isPlaying,
      timestamp: room.videoState.lastUpdate,
    });
  });

  socket.on("send-message", ({ message }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) return;

    const chatMessage = {
      id: uuidv4(),
      username: socket.username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      color: room.users.find((u) => u.id === socket.id)?.color,
    };

    room.messages.push(chatMessage);

    // Keep only last 100 messages
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    io.to(roomCode).emit("new-message", chatMessage);
  });

  socket.on("send-reaction", ({ emoji }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) return;

    const reaction = {
      id: uuidv4(),
      username: socket.username,
      emoji,
      timestamp: Date.now(),
      color: room.users.find((u) => u.id === socket.id)?.color,
    };

    io.to(roomCode).emit("new-reaction", reaction);
  });

  socket.on("typing-start", () => {
    const roomCode = socket.roomCode;
    if (roomCode) {
      socket
        .to(roomCode)
        .emit("user-typing", { username: socket.username, isTyping: true });
    }
  });

  socket.on("typing-stop", () => {
    const roomCode = socket.roomCode;
    if (roomCode) {
      socket
        .to(roomCode)
        .emit("user-typing", { username: socket.username, isTyping: false });
    }
  });

  socket.on("transfer-host", ({ newHostUsername }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room || room.host !== socket.id) {
      socket.emit("error", {
        message: "Only current host can transfer host status",
      });
      return;
    }

    // Find the new host user
    const newHostUser = room.users.find(
      (user) => user.username === newHostUsername
    );
    if (!newHostUser) {
      socket.emit("error", { message: "Selected user not found in room" });
      return;
    }

    // Transfer host status
    room.host = newHostUser.id;

    // Notify the new host
    io.to(newHostUser.id).emit("host-status", { isHost: true });

    // Notify all other users (except the new host) that they are not host
    room.users.forEach((user) => {
      if (user.id !== newHostUser.id) {
        io.to(user.id).emit("host-status", { isHost: false });
      }
    });

    console.log(
      `Host transferred from ${socket.username} to ${newHostUsername} in room ${roomCode}`
    );
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const roomCode = socket.roomCode;
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        // Find the user before removing them
        const leavingUser = room.users.find((user) => user.id === socket.id);
        room.users = room.users.filter((user) => user.id !== socket.id);

        // Transfer host if needed
        if (room.host === socket.id && room.users.length > 0) {
          room.host = room.users[0].id;
          io.to(room.users[0].id).emit("host-status", { isHost: true });
        }

        // Mark room as empty but don't delete immediately (for shared links)
        if (room.users.length === 0) {
          room.emptyTimestamp = Date.now();
          // Delete room after 10 minutes of being empty
          setTimeout(() => {
            const currentRoom = rooms.get(roomCode);
            if (currentRoom && currentRoom.users.length === 0) {
              rooms.delete(roomCode);
              console.log(
                `Room ${roomCode} deleted after being empty for 10 minutes`
              );
            }
          }, 10 * 60 * 1000); // 10 minutes
        } else {
          // Send username with the user-left event
          socket.to(roomCode).emit("user-left", {
            userId: socket.id,
            username: leavingUser ? leavingUser.username : socket.username,
          });

          // Send updated user list to ALL remaining users in the room
          io.to(roomCode).emit("users-updated", { users: room.users });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
