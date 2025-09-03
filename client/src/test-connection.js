// Simple test to verify connection to server
const serverUrl = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

console.log("Testing connection to:", serverUrl);

// Test the create-room endpoint
fetch(`${serverUrl}/api/create-room`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
})
  .then((response) => {
    console.log("Response status:", response.status);
    return response.json();
  })
  .then((data) => {
    console.log("Success:", data);
  })
  .catch((error) => {
    console.error("Error:", error);
  });

// Test the test endpoint
fetch(`${serverUrl}/api/test`)
  .then((response) => response.json())
  .then((data) => {
    console.log("Test endpoint:", data);
  })
  .catch((error) => {
    console.error("Test endpoint error:", error);
  });
