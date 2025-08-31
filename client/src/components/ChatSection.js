import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingReactions from './FloatingReactions';

const ChatSection = React.memo(({ 
  users, 
  messages, 
  typingUsers, 
  currentUsername, 
  onSendMessage, 
  onSendReaction,
  onTyping,
  socket 
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [reactions, setReactions] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const emojis = ['😂', '❤️', '🔥', '😮', '👍', '👎', '😢', '😡'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    socket.on('new-reaction', (reaction) => {
      setReactions(prev => [...prev, reaction]);
      
      // Remove reaction after animation
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 3000);
    });

    return () => {
      socket.off('new-reaction');
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput('');
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
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageSizeClass = (message) => {
    const length = message.length;
    if (length <= 30) return 'short-message';
    if (length <= 80) return 'medium-message';
    if (length <= 150) return 'long-message';
    return 'very-long-message';
  };

  return (
    <>
      <div className="chat-section">
        <div className="users-list">
          <div className="users-title">Online Users ({users.length}/6)</div>
          <div>
            {users.map(user => (
              <span 
                key={user.id} 
                className={`user-item ${user.isHost ? 'host-item' : ''}`}
                style={{ color: user.color }}
              >
                {user.isHost && '👑 '}
                {user.username}
                {user.username === currentUsername && ' (You)'}
                {user.isHost && ' (Host)'}
              </span>
            ))}
          </div>
        </div>

        <div className="chat-messages">
          <AnimatePresence>
            {messages.map(message => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={message.type === 'system' ? 'system-message' : 'message'}
              >
                {message.type === 'system' ? (
                  <div className="system-message-content">
                    <span className="system-icon">{message.icon}</span>
                    <span className="system-text">{message.message}</span>
                    <span className="system-time">{formatTime(message.timestamp)}</span>
                  </div>
                ) : (
                  <>
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
                    <div className={`message-content ${getMessageSizeClass(message.message)}`}>
                      {message.message}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.length <= 3 ? (
              // Show all names if 3 or fewer users
              <>
                {typingUsers.map((typingUser, index) => {
                  const user = users.find(u => u.username === typingUser);
                  return (
                    <span key={typingUser}>
                      <span 
                        className="typing-username"
                        style={{ color: user?.color || '#a0aec0' }}
                      >
                        {typingUser}
                      </span>
                      {index < typingUsers.length - 1 && (
                        index === typingUsers.length - 2 ? ' and ' : ', '
                      )}
                    </span>
                  );
                })}
                <span className="typing-text">
                  {' '}{typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </>
            ) : (
              // Show first 2 names + count if more than 3 users
              <>
                {typingUsers.slice(0, 2).map((typingUser, index) => {
                  const user = users.find(u => u.username === typingUser);
                  return (
                    <span key={typingUser}>
                      <span 
                        className="typing-username"
                        style={{ color: user?.color || '#a0aec0' }}
                      >
                        {typingUser}
                      </span>
                      {index === 0 && ', '}
                    </span>
                  );
                })}
                <span className="typing-text">
                  {' '}and {typingUsers.length - 2} other{typingUsers.length - 2 > 1 ? 's' : ''} are typing...
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
                  if (e.key === 'Enter' && !e.shiftKey) {
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
            {emojis.map(emoji => (
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

      <FloatingReactions reactions={reactions} />
    </>
  );
});

ChatSection.displayName = 'ChatSection';

export default ChatSection;