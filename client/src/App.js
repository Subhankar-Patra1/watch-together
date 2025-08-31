import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import LandingPage from "./components/LandingPage";
import RoomPage from "./components/RoomPage";
import "./App.css";

const serverUrl =
  process.env.REACT_APP_SERVER_URL ||
  "https://watch-together-server-production-d25a.up.railway.app";
console.log("🚀 Using server URL:", serverUrl);
const socket = io(serverUrl);

function App() {
  const [currentPage, setCurrentPage] = useState("landing");
  const [roomData, setRoomData] = useState(null);
  const [username, setUsername] = useState("");
  const [sharedRoomCode, setSharedRoomCode] = useState(null);

  // Check for shared room link on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCodeFromUrl = urlParams.get("roomCode");

    if (roomCodeFromUrl) {
      setSharedRoomCode(roomCodeFromUrl.toUpperCase());
      // Clear the URL parameter for cleaner URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const joinRoom = (roomCode, user) => {
    setUsername(user);
    setRoomData({ roomCode });
    setCurrentPage("room");
    socket.emit("join-room", { roomCode, username: user });
  };

  const createRoom = async (user) => {
    try {
      console.log("=== DEBUG INFO ===");
      console.log("Server URL:", serverUrl);
      console.log("Environment:", process.env.NODE_ENV);
      console.log(
        "All env vars:",
        Object.keys(process.env).filter((key) => key.startsWith("REACT_APP"))
      );

      const response = await fetch(`${serverUrl}/api/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Server response data:", data);

      if (!data.roomCode) {
        throw new Error("Invalid response from server - no room code");
      }

      joinRoom(data.roomCode, user);
    } catch (error) {
      console.error("=== ERROR DETAILS ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw error; // Re-throw to let the component handle it
    }
  };

  const leaveRoom = () => {
    socket.disconnect();
    socket.connect();
    setCurrentPage("landing");
    setRoomData(null);
    setUsername("");
  };

  return (
    <div className="App">
      {currentPage === "landing" && (
        <LandingPage
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          sharedRoomCode={sharedRoomCode}
        />
      )}
      {currentPage === "room" && (
        <RoomPage
          socket={socket}
          roomCode={roomData.roomCode}
          username={username}
          onLeaveRoom={leaveRoom}
        />
      )}
    </div>
  );
}

export default App;
