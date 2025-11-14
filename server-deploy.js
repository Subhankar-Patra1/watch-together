// Simple deployment wrapper for Render
// This file helps Render find and run the server correctly

const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting WatchTogether Server...');
console.log('📁 Current directory:', process.cwd());
console.log('📁 Server directory:', path.join(__dirname, 'server'));

// Change to server directory and start the server
process.chdir(path.join(__dirname, 'server'));

console.log('📁 Changed to directory:', process.cwd());
console.log('🔍 Files in server directory:');
const fs = require('fs');
console.log(fs.readdirSync('.'));

// Start the server
const server = spawn('node', ['index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || 10000 }
});

server.on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔄 Server process exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.kill('SIGINT');
});