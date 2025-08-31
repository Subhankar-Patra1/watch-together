import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingReactions = ({ reactions }) => {
  return (
    <div className="reactions-overlay">
      <AnimatePresence>
        {reactions.map(reaction => (
          <motion.div
            key={reaction.id}
            className="floating-reaction"
            initial={{
              opacity: 1,
              scale: 0.5,
              x: Math.random() * 250 + 35, // Keep within chat area width (320px)
              y: 400 // Start from bottom of chat area
            }}
            animate={{
              opacity: 0,
              scale: 1.2,
              y: 50, // Float to top of chat area
              x: Math.random() * 100 - 50 // Small horizontal drift
            }}
            exit={{
              opacity: 0,
              scale: 0
            }}
            transition={{
              duration: 2.5,
              ease: "easeOut"
            }}
            style={{
              color: reaction.color,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FloatingReactions;