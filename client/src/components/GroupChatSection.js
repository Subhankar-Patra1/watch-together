import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FloatingReactions from "./FloatingReactions";

const GroupChatSection = ({
  users,
  messages,
  typingUsers,
  currentUsername,
  onSendMessage,
  onSendReaction,
  onTyping,
  socket,
}) => {
  const [messageInput, setMessageInput] = useState("");
  const [reactions, setReactions] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const emojis = ["😂", "❤️", "🔥", "😮", "👍", "👎", "😢", "😡"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    socket.on("new-reaction", (reaction) => {
      setReactions((prev) => [...prev, reaction]);

      // Remove reaction after animation
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3000);
    });

    return () => {
      socket.off("new-reaction");
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput("");
      handleTypingStop();
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    // Handle typing indicator
    if (e.target.value.trim() && !typingTimeoutRef.current) {
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  const handleTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      onTyping(false);
    }
  };

  const handleReaction = (emoji) => {
    onSendReaction(emoji);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageSizeClass = (message) => {
    const length = message.length;
    if (length <= 30) return "short-message";
    if (length <= 80) return "medium-message";
    if (length <= 150) return "long-message";
    return "very-long-message";
  };

  return (
    <>
      <div className="group-chat-section">
        <div className="section-header">
          <h3>💬 Group Chat</h3>
          <div className="online-count">
            <span className="online-indicator">🟢</span>
            <span>{users.length} online</span>
          </div>
        </div>

        <div className="chat-content">
          <div className="users-list-compact">
            {users.map((user) => {
              console.log(
                "User:",
                user.username,
                "Current:",
                currentUsername,
                "User object:",
                JSON.stringify(user, null, 2)
              );

              // Try multiple ways to identify current user
              const isCurrentUser =
                (currentUsername &&
                  String(user.username).trim().toLowerCase() ===
                    String(currentUsername).trim().toLowerCase()) ||
                user.isCurrentUser ||
                user.isSelf ||
                user.isMe;

              console.log("Is current user:", isCurrentUser);

              return (
                <div
                  key={user.id}
                  className={`user-badge ${user.isHost ? "host-badge" : ""} ${
                    isCurrentUser ? "current-user-badge" : ""
                  }`}
                >
                  <span className="user-name" style={{ color: user.color }}>
                    {user.isHost && "👑 "}
                    {user.username}
                    {isCurrentUser && (
                      <span className="you-indicator"> (You)</span>
                    )}
                    {user.isHost && " (Host)"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="chat-messages">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`message ${
                    message.type === "system"
                      ? "system-message"
                      : message.username === currentUsername
                      ? "own-message"
                      : "other-message"
                  } ${getMessageSizeClass(message.message || "")}`}
                >
                  {message.type === "system" ? (
                    <div className="system-content">
                      <span className="system-icon">{message.icon}</span>
                      <span className="system-text">{message.message}</span>
                    </div>
                  ) : message.type === "reaction" ? (
                    <div className="reaction-message">
                      <span className="reaction-emoji">{message.emoji}</span>
                      <span
                        className="reaction-user"
                        style={{ color: message.color }}
                      >
                        {message.username}
                      </span>
                    </div>
                  ) : (
                    <div className="message-content">
                      <div className="message-header">
                        <span
                          className="message-username"
                          style={{ color: message.color }}
                        >
                          {message.username}
                        </span>
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="message-text">{message.message}</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              {typingUsers.length <= 3 ? (
                <>
                  {typingUsers.map((typingUser, index) => {
                    const user = users.find((u) => u.username === typingUser);
                    return (
                      <span key={typingUser}>
                        <span
                          className="typing-username"
                          style={{ color: user?.color || "#a0aec0" }}
                        >
                          {typingUser}
                        </span>
                        {index < typingUsers.length - 1 &&
                          (index === typingUsers.length - 2 ? " and " : ", ")}
                      </span>
                    );
                  })}
                  <span className="typing-text">
                    {" "}
                    {typingUsers.length === 1 ? "is" : "are"} typing...
                  </span>
                </>
              ) : (
                <>
                  {typingUsers.slice(0, 2).map((typingUser, index) => {
                    const user = users.find((u) => u.username === typingUser);
                    return (
                      <span key={typingUser}>
                        <span
                          className="typing-username"
                          style={{ color: user?.color || "#a0aec0" }}
                        >
                          {typingUser}
                        </span>
                        {index === 0 && ", "}
                      </span>
                    );
                  })}
                  <span className="typing-text">
                    {" "}
                    and {typingUsers.length - 2} other
                    {typingUsers.length - 2 > 1 ? "s" : ""} are typing...
                  </span>
                </>
              )}
              <span className="typing-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            </div>
          )}

          <div className="chat-input-container">
            <form onSubmit={handleSendMessage}>
              <div className="chat-input-row">
                <textarea
                  className="chat-input"
                  value={messageInput}
                  onChange={handleInputChange}
                  onBlur={handleTypingStop}
                  placeholder="Type a message..."
                  rows={2}
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button type="submit" className="send-btn">
                  Send
                </button>
              </div>
            </form>

            <div className="emoji-bar">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  className="emoji-btn"
                  onClick={() => handleReaction(emoji)}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FloatingReactions reactions={reactions} />
    </>
  );
};

export default GroupChatSection;
