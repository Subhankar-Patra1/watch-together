const express = require('express');
const router = express.Router();

router.get('/api/ice-servers', (req, res) => {
  const iceServers = [
    // Always include Google's free STUN servers as a baseline
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Add TURN servers if configured in environment variables
  if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    const urls = process.env.TURN_URLS.split(',').map(url => url.trim());
    
    iceServers.push({
      urls: urls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    });
  }

  res.json({ iceServers });
});

module.exports = router;
