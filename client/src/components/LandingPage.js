import React, { useState, useEffect } from "react";

const LandingPage = ({ onCreateRoom, onJoinRoom, sharedRoomCode, joinError }) => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Handle join errors from parent component
  useEffect(() => {
    if (joinError) {
      setError(joinError);
      setIsJoining(false); // Reset joining state
    }
  }, [joinError]);

  // Pre-fill room code if coming from shared link
  useEffect(() => {
    if (sharedRoomCode) {
      setRoomCode(sharedRoomCode);
      setError(""); // Clear any existing errors
    }
  }, [sharedRoomCode]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (isCreating) {
      return; // Prevent double-clicking
    }

    setError("");
    setIsCreating(true);

    try {
      await onCreateRoom(username.trim());
      // Success - the component will change, so no need to reset loading state
    } catch (err) {
      console.error("Error creating room:", err);
      setError("Failed to create room. Please try again.");
      // Add a small delay before allowing retry
      setTimeout(() => {
        setIsCreating(false);
      }, 1000);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim()) {
      setError("Please enter both username and room code");
      return;
    }

    setError("");
    setIsJoining(true);

    // Let Socket.IO handle room validation - no need for API pre-check
    onJoinRoom(roomCode.toUpperCase(), username.trim());
  };

  return (
    <div className="landing-container">
      <h1 className="landing-title">🎬 WatchTogether</h1>
      <p className="landing-subtitle">
        Watch YouTube videos with friends in perfect sync. Create a room or join
        with a code to get started!
      </p>

      <div className="landing-form">
        {error && <div className="error-message">{error}</div>}
        {sharedRoomCode && (
          <div className="shared-link-notice">
            🔗 You're joining room <strong>{sharedRoomCode}</strong> via shared
            link!
          </div>
        )}

        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label className="form-label">Your Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create New Room"}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <form onSubmit={handleJoinRoom}>
          <div className="form-group">
            <label className="form-label">Room Code</label>
            <input
              type="text"
              className="form-input"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-secondary"
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LandingPage;
