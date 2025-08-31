// Simple proxy to server/index.js for Render deployment
console.log("Starting server proxy...");
console.log("Node version:", process.version);
console.log("Working directory:", process.cwd());

try {
  console.log("Loading server from ./server/index.js");
  require("./server/index.js");
  console.log("Server loaded successfully");
} catch (error) {
  console.error("Error loading server:", error);
  process.exit(1);
}
