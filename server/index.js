const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const axios = require("axios");
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
    : true; // Allow all origins in development

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// CORS middleware
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

// CORS Proxy for video streams (VLC-style bypass)
app.get("/api/proxy-stream", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    // Prevent recursive proxying
    if (url.includes("/api/proxy-stream") || url.includes("localhost:5000")) {
      console.log(`🚫 Preventing recursive proxy for: ${url}`);
      return res.status(400).json({ error: "Recursive proxy detected" });
    }

    console.log(`🔗 Proxying stream request for: ${url}`);

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Set headers to mimic a real browser (Chrome) request
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "application/vnd.apple.mpegurl, application/x-mpegurl, application/octet-stream, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity", // Don't compress for streaming
      Connection: "keep-alive",
      Range: req.headers.range || "bytes=0-", // Support range requests
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "video",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Ch-Ua":
        '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
    };

    // Add referrer if the original URL contains domain info
    try {
      headers["Referer"] = `${targetUrl.protocol}//${targetUrl.hostname}/`;
      headers["Origin"] = `${targetUrl.protocol}//${targetUrl.hostname}`;

      // Special handling for shadowlandschronicles.com - try different referrers
      if (targetUrl.hostname.includes("shadowlandschronicles.com")) {
        // Try different possible referrer patterns
        headers["Referer"] = "https://shadowlandschronicles.com/";
        // Remove some security headers that might block us
        delete headers["Sec-Fetch-Site"];
        headers["Sec-Fetch-Site"] = "same-origin";
        // Add cookies header in case it's needed
        headers["Cookie"] = "";
      }
    } catch (e) {
      console.log("Could not set referrer headers:", e.message);
    }

    const response = await axios({
      method: "GET",
      url: targetUrl.href,
      headers: headers,
      responseType: "stream",
      timeout: 60000, // Increased to 60 seconds for slow streaming sites
      maxRedirects: 10, // More redirects for complex CDNs
      validateStatus: function (status) {
        return status < 500; // Accept redirects and client errors
      },
    });

    console.log(
      `✅ Successful response: ${response.status} for ${targetUrl.href}`
    );
    console.log(`📋 Response headers:`, response.headers);
    console.log(`📄 Content-Type: ${response.headers["content-type"]}`);

    // Check if we're getting HTML instead of M3U8
    const contentType = response.headers["content-type"] || "";
    if (contentType.includes("text/html")) {
      console.log(
        "⚠️ WARNING: Received HTML content instead of M3U8 playlist!"
      );
      console.log(
        "🔒 This might be a protected URL requiring authentication or different headers"
      );
    }

    // Forward response headers
    res.set({
      "Content-Type":
        response.headers["content-type"] || "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Range",
      "Content-Length": response.headers["content-length"],
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
    });

    // Handle range requests
    if (response.headers["content-range"]) {
      res.set("Content-Range", response.headers["content-range"]);
      res.status(206); // Partial Content
    }

    // Pipe the stream
    response.data.pipe(res);

    response.data.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error" });
      }
    });
  } catch (error) {
    console.error("Proxy error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to proxy stream",
        details: error.message,
        url: req.query.url,
      });
    }
  }
});

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
      userCount: 0,
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
    users: room.users.map((u) => ({ id: u.id, username: u.username })),
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
      console.log(`Available rooms: [${Array.from(rooms.keys()).join(", ")}]`);
      console.log(`Total rooms in memory: ${rooms.size}`);
      socket.emit("error", {
        message: "Room not found",
        details: `Room ${roomCode} does not exist. Available rooms: ${rooms.size}`,
        availableRooms: Array.from(rooms.keys()),
        requestedRoom: roomCode,
      });
      return;
    }

    console.log(`Room ${roomCode} found with ${room.users.length} users`);

    if (room.users.length >= 6) {
      console.log(`ERROR: Room ${roomCode} is full (${room.users.length}/6)`);
      socket.emit("error", {
        message: "Room is full",
        details: `Room ${roomCode} has ${room.users.length}/6 users`,
        currentUsers: room.users.map((u) => u.username),
      });
      return;
    }

    // Check if username is already taken
    if (room.users.some((user) => user.username === username)) {
      console.log(
        `ERROR: Username ${username} already taken in room ${roomCode}`
      );
      console.log(
        `Existing users: ${room.users.map((u) => u.username).join(", ")}`
      );
      socket.emit("error", {
        message: "Username already taken",
        details: `Username "${username}" is already in use in room ${roomCode}`,
        existingUsers: room.users.map((u) => u.username),
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

    // Determine if this user will be the host (first user)
    const isHost = !room.host;

    const user = {
      id: socket.id,
      username,
      color: userColor,
      isHost: isHost,
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

    // SIMPLIFIED: Send voice chat notification to ALL new users if voice chat exists
    if (room.voiceChat && room.voiceChat.active) {
      console.log(
        `🔔 FORCE sending voice chat notification to new user: ${username}`
      );
      console.log(
        `Voice chat exists and is active - sending notification regardless`
      );
      console.log(`🔍 Debug info:`);
      console.log(
        `  - room.voiceChat.initiator: "${room.voiceChat.initiator}"`
      );
      console.log(
        `  - room.voiceChat.members: [${room.voiceChat.members.join(", ")}]`
      );
      console.log(`  - new user joining: "${username}"`);

      const initiatorUser = room.users.find(
        (u) => u.username === room.voiceChat.initiator
      );

      console.log(`  - initiatorUser found: ${!!initiatorUser}`);
      console.log(`  - initiatorUser.username: "${initiatorUser?.username}"`);
      console.log(`  - initiatorUser.color: "${initiatorUser?.color}"`);

      // Send immediately without delay
      socket.emit("voice-chat-notification", {
        initiator: room.voiceChat.initiator,
        initiatorColor: initiatorUser ? initiatorUser.color : "#4ECDC4",
        message: `${room.voiceChat.initiator} started Voice chat, want to join?`,
      });

      console.log(
        `🔔 Notification sent with message: "${room.voiceChat.initiator} started Voice chat, want to join?"`
      );

      // Also send voice chat started event
      socket.emit("voice-chat-started", {
        initiator: room.voiceChat.initiator,
        members: room.voiceChat.members,
      });

      console.log(`🔔 FORCED voice chat notification sent to ${username}`);
    } else {
      console.log(`🚫 No voice chat to notify ${username} about`);
      console.log(`  - Voice chat exists: ${!!room.voiceChat}`);
      console.log(`  - Voice chat active: ${room.voiceChat?.active}`);
    }

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
    io.to(roomCode).emit("users-updated", {
      users: room.users,
    });
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
    } else if (videoData.type === "hls") {
      // HLS stream
      processedVideoData = {
        type: "hls",
        url: videoData.url,
      };
    } else if (videoData.type === "direct") {
      // Direct video file
      processedVideoData = {
        type: "direct",
        url: videoData.url,
      };
    } else if (videoData.type === "vimeo" || 
               videoData.type === "dailymotion" || 
               videoData.type === "twitch" || 
               videoData.type === "facebook" || 
               videoData.type === "instagram" || 
               videoData.type === "tiktok" || 
               videoData.type === "embed" || 
               videoData.type === "dash" || 
               videoData.type === "generic") {
      // New video types
      processedVideoData = {
        type: videoData.type,
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

  socket.on("video-sync-request", ({ action, currentTime }) => {
    console.log(`🔄 Received video-sync-request from ${socket.username}:`, {
      action,
      currentTime,
      socketId: socket.id,
      roomCode: socket.roomCode,
    });

    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) {
      console.log(`🚫 Room ${roomCode} not found`);
      socket.emit("sync-error", { message: "Room not found" });
      return;
    }

    // Check if the user is the host (only host can sync)
    const user = room.users.find((u) => u.id === socket.id);
    if (!user) {
      console.log(`🚫 User ${socket.username} not found in room ${roomCode}`);
      socket.emit("sync-error", { message: "User not found in room" });
      return;
    }

    if (!user.isHost) {
      console.log(
        `🚫 Non-host user ${socket.username} tried to sync video in room ${roomCode}`
      );
      socket.emit("sync-error", { message: "Only host can sync video" });
      return;
    }

    console.log(
      `✅ Host ${socket.username} is syncing video in room ${roomCode}`
    );

    // Update room video state
    room.videoState.currentTime = currentTime;
    room.videoState.lastUpdate = Date.now();

    if (action === "play") {
      room.videoState.isPlaying = true;
    } else if (action === "pause") {
      room.videoState.isPlaying = false;
    }

    const syncData = {
      action,
      currentTime: room.videoState.currentTime,
      isPlaying: room.videoState.isPlaying,
      timestamp: room.videoState.lastUpdate,
      syncedBy: socket.username, // Add who triggered the sync
    };

    console.log(`🔄 Emitting video-sync to room ${roomCode}:`, syncData);

    // Emit sync to all other users in the room
    socket.to(roomCode).emit("video-sync", syncData);

    // Confirm sync was sent
    socket.emit("sync-success", { message: "Sync sent to all users" });

    console.log(
      `🔄 Host ${socket.username} synced video in room ${roomCode} at ${currentTime}s`
    );
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

  // Typing indicators
  socket.on("typing-start", () => {
    const roomCode = socket.roomCode;
    if (roomCode && socket.username) {
      socket.to(roomCode).emit("user-typing", {
        username: socket.username,
        isTyping: true,
      });
    }
  });

  socket.on("typing-stop", () => {
    const roomCode = socket.roomCode;
    if (roomCode && socket.username) {
      socket.to(roomCode).emit("user-typing", {
        username: socket.username,
        isTyping: false,
      });
    }
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
      x: Math.random() * 100,
      y: Math.random() * 100,
    };

    io.to(roomCode).emit("new-reaction", reaction);
  });

  // Voice Chat Events
  socket.on("start-voice-chat", ({ username }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) return;

    const user = room.users.find((u) => u.id === socket.id);
    if (!user) return;

    // Initialize voice chat in room
    room.voiceChat = {
      active: true,
      initiator: username,
      initiatorSocketId: socket.id,
      members: [username],
      memberSockets: [socket.id],
    };

    // Add system message for voice chat start
    const systemMessage = {
      id: uuidv4(),
      type: "system",
      message: `${username} started a voice chat`,
      timestamp: new Date().toISOString(),
      icon: "🎤",
    };
    room.messages.push(systemMessage);
    io.to(roomCode).emit("new-message", systemMessage);

    // Send notification to all other users in the room
    socket.to(roomCode).emit("voice-chat-notification", {
      initiator: username,
      initiatorColor: user.color,
      message: `${username} started Voice chat, want to join?`,
    });

    // Confirm to initiator that voice chat started
    socket.emit("voice-chat-started", {
      initiator: username,
      members: [username],
    });

    console.log(`🎤 ${username} started voice chat in room ${roomCode}`);
  });

  socket.on("join-voice-chat", ({ username }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room || !room.voiceChat || !room.voiceChat.active) return;

    // Add user to voice chat
    if (!room.voiceChat.members.includes(username)) {
      // Get existing members with their socket IDs before adding new member
      const existingMembers = room.voiceChat.memberSockets.map(
        (socketId, index) => ({
          username: room.voiceChat.members[index],
          socketId: socketId,
        })
      );

      room.voiceChat.members.push(username);
      room.voiceChat.memberSockets.push(socket.id);

      // Add system message for user joining voice chat
      const systemMessage = {
        id: uuidv4(),
        type: "system",
        message: `${username} joined the voice chat`,
        timestamp: new Date().toISOString(),
        icon: "🔊",
      };
      room.messages.push(systemMessage);
      io.to(roomCode).emit("new-message", systemMessage);

      // Notify all users in voice chat about new member
      room.voiceChat.memberSockets.forEach((socketId) => {
        io.to(socketId).emit("voice-chat-member-joined", {
          newMember: username,
          socketId: socket.id,
          members: room.voiceChat.members,
          existingMembers: socketId === socket.id ? existingMembers : undefined,
        });
      });

      // Also broadcast to entire room to update voice chat status
      io.to(roomCode).emit("voice-chat-member-updated", {
        members: room.voiceChat.members,
        action: "joined",
        newMember: username,
      });

      // Send current voice chat state to the new joiner
      socket.emit("voice-chat-started", {
        initiator: room.voiceChat.initiator,
        members: room.voiceChat.members,
      });

      console.log(`🎤 ${username} joined voice chat in room ${roomCode}`);
      console.log(`🎤 Existing members:`, existingMembers);
    }
  });

  socket.on("leave-voice-chat", ({ username }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room || !room.voiceChat || !room.voiceChat.active) return;

    // Remove user from voice chat
    const memberIndex = room.voiceChat.members.indexOf(username);
    const socketIndex = room.voiceChat.memberSockets.indexOf(socket.id);

    if (memberIndex > -1) {
      room.voiceChat.members.splice(memberIndex, 1);
    }
    if (socketIndex > -1) {
      room.voiceChat.memberSockets.splice(socketIndex, 1);
    }

    // Add system message for user leaving voice chat
    const systemMessage = {
      id: uuidv4(),
      type: "system",
      message: `${username} left the voice chat`,
      timestamp: new Date().toISOString(),
      icon: "🔇",
    };
    room.messages.push(systemMessage);
    io.to(roomCode).emit("new-message", systemMessage);

    // If no members left, end voice chat
    if (room.voiceChat.members.length === 0) {
      const endMessage = {
        id: uuidv4(),
        type: "system",
        message: "Voice chat ended",
        timestamp: new Date().toISOString(),
        icon: "🎤",
      };
      room.messages.push(endMessage);
      room.voiceChat = null;
      io.to(roomCode).emit("new-message", endMessage);
      io.to(roomCode).emit("voice-chat-ended");
      console.log(`🎤 Voice chat ended in room ${roomCode} - no members left`);
    } else {
      // Notify remaining members
      room.voiceChat.memberSockets.forEach((socketId) => {
        io.to(socketId).emit("voice-chat-member-left", {
          leftMember: username,
          socketId: socket.id,
          members: room.voiceChat.members,
        });
      });

      // Also broadcast to entire room to update voice chat status
      io.to(roomCode).emit("voice-chat-member-updated", {
        members: room.voiceChat.members,
        action: "left",
        leftMember: username,
      });

      console.log(`🎤 ${username} left voice chat in room ${roomCode}`);
    }
  });

  // WebRTC Signaling for Voice Chat
  socket.on("voice-offer", ({ offer, targetSocketId }) => {
    socket.to(targetSocketId).emit("voice-offer", {
      offer,
      fromSocketId: socket.id,
    });
  });

  socket.on("voice-answer", ({ answer, targetSocketId }) => {
    socket.to(targetSocketId).emit("voice-answer", {
      answer,
      fromSocketId: socket.id,
    });
  });

  socket.on("voice-ice-candidate", ({ candidate, targetSocketId }) => {
    socket.to(targetSocketId).emit("voice-ice-candidate", {
      candidate,
      fromSocketId: socket.id,
    });
  });

  socket.on("voice-chat-mute-status", ({ username, isMuted }) => {
    const roomCode = socket.roomCode;
    if (roomCode) {
      // Broadcast mute status to all room members except sender
      socket.to(roomCode).emit("voice-chat-mute-status", {
        username,
        isMuted,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const roomCode = socket.roomCode;
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        // Find the user before removing them
        const leavingUser = room.users.find((user) => user.id === socket.id);

        // Handle voice chat cleanup
        if (room.voiceChat && room.voiceChat.active) {
          const memberIndex = room.voiceChat.memberSockets.indexOf(socket.id);
          if (memberIndex > -1) {
            // Remove from voice chat
            const username = room.voiceChat.members[memberIndex];
            room.voiceChat.members.splice(memberIndex, 1);
            room.voiceChat.memberSockets.splice(memberIndex, 1);

            // If no members left, end voice chat
            if (room.voiceChat.members.length === 0) {
              room.voiceChat = null;
              io.to(roomCode).emit("voice-chat-ended");
              console.log(
                `🎤 Voice chat ended in room ${roomCode} - disconnection`
              );
            } else {
              // Notify remaining members
              room.voiceChat.memberSockets.forEach((socketId) => {
                io.to(socketId).emit("voice-chat-member-left", {
                  leftMember: username,
                  socketId: socket.id,
                  members: room.voiceChat.members,
                });
              });

              // Also broadcast to entire room to update voice chat status
              io.to(roomCode).emit("voice-chat-member-updated", {
                members: room.voiceChat.members,
                action: "left",
                leftMember: username,
              });

              console.log(
                `🎤 ${username} left voice chat due to disconnection`
              );
            }
          }
        }

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
          io.to(roomCode).emit("users-updated", {
            users: room.users.map((user) => ({
              ...user,
              isHost: user.id === room.host,
            })),
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
