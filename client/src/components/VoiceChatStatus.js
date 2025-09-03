import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const VoiceChatStatus = ({
  activeVoiceChat,
  voiceChatMembers,
  mutedUsers,
  users,
  currentUsername,
}) => {
  return (
    <AnimatePresence>
      {activeVoiceChat && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="voice-chat-status-section"
        >
          <div className="voice-status-header">
            <span className="voice-icon">🎤</span>
            <span className="voice-text">Voice Chat Active</span>
          </div>
          {voiceChatMembers.length > 0 && (
            <div className="voice-members">
              {voiceChatMembers.map((member) => {
                const user = users.find((u) => u.username === member);
                const isMuted = mutedUsers?.get(member) || false;
                return (
                  <span
                    key={member}
                    className="voice-member"
                    style={{ color: user?.color || "#a0aec0" }}
                  >
                    {isMuted && <span className="mute-indicator">🔇 </span>}
                    {member}
                    {member === currentUsername && " (You)"}
                  </span>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceChatStatus;
