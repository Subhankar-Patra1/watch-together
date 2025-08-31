// Debug script to test room joining issue
import io from "socket.io-client";

const serverUrl =
  "https://watch-together-server-production-d25a.up.railway.app";
console.log("🔗 Connecting to:", serverUrl);

const socket = io(serverUrl);

let testRoomCode = null;

socket.on("connect", () => {
  console.log("✅ Connected to server");

  // Test 1: Create a room
  console.log("📤 Creating a test room...");
  fetch(`${serverUrl}/api/create-room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      testRoomCode = data.roomCode;
      console.log("🎯 Room created:", testRoomCode);

      // Test 2: User A joins the room
      console.log("👤 User A joining room...");
      socket.emit("join-room", { roomCode: testRoomCode, username: "UserA" });
    })
    .catch((error) => {
      console.error("❌ Error creating room:", error);
    });
});

socket.on("room-joined", (data) => {
  console.log("✅ User A joined successfully:", data.roomCode);

  // Test 3: Simulate User B trying to join the same room
  setTimeout(() => {
    console.log("👤 User B attempting to join the same room...");
    const socketB = io(serverUrl);

    socketB.on("connect", () => {
      console.log("✅ User B connected");
      socketB.emit("join-room", { roomCode: testRoomCode, username: "UserB" });
    });

    socketB.on("room-joined", (data) => {
      console.log("✅ User B joined successfully!");
      console.log("🎉 TEST PASSED: Multiple users can join the same room");
    });

    socketB.on("error", (data) => {
      console.error("❌ User B failed to join:", data.message);
      console.log("💡 This is the bug we need to fix!");
    });

    socketB.on("connect_error", (error) => {
      console.error("❌ User B connection error:", error);
    });
  }, 2000); // Wait 2 seconds before User B tries to join
});

socket.on("error", (data) => {
  console.error("❌ User A failed to join:", data.message);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
});

socket.on("disconnect", () => {
  console.log("🔌 Disconnected from server");
});
