# Voice Chat Testing Guide

## Quick Test Steps

### Testing Voice Chat (2 Users Minimum)

1. **Open 2 browser tabs/windows** at `http://localhost:3001`

2. **Create a room** in the first tab:

   - Click "Create Room"
   - Note the room code

3. **Join the room** in the second tab:

   - Click "Join Room"
   - Enter the room code and a different username

4. **Start Voice Chat** (User 1):

   - Click the microphone button (🎤) in the chat section
   - Allow microphone access when prompted
   - Should see "Voice chat started" message in chat

5. **Join Voice Chat** (User 2):

   - Should see green notification: "User X started Voice chat, want to join?"
   - Click "Join" button
   - Allow microphone access when prompted
   - Should see "User Y joined voice chat" message in chat

6. **Test Audio**:
   - Speak in one tab, should hear in the other
   - Check browser console for connection logs
   - Look for debug info above voice button

## Troubleshooting

### No Audio Between Users

1. **Check Browser Console** - Look for:

   - "✅ Audio playing for [socketId]" - Good
   - "❌ Auto-play failed" - Click anywhere to enable audio
   - WebRTC connection state logs

2. **Check Microphone Access**:

   - Look for microphone icon in browser address bar
   - Ensure both users granted permissions

3. **Check Network**:
   - WebRTC requires good network connectivity
   - Try refreshing both tabs

### Debug Information

- **Debug info appears above voice button**
- **Check console logs** for detailed WebRTC info
- **Connection states**: connecting → connected
- **Audio elements**: Should show "Audio playing from [socketId]"

### Browser Compatibility

- **Chrome/Edge**: Best support
- **Firefox**: Good support
- **Safari**: Requires HTTPS in production
- **Mobile**: May need special handling

## Key Features Implemented

✅ **Voice Button Placement**: Between message input and send button
✅ **Universal Access**: All users can start/join voice chats
✅ **Smart Notifications**: Green notification with "Join" button
✅ **System Messages**: Auto-generated chat messages for voice events
✅ **WebRTC Audio**: Peer-to-peer voice communication
✅ **Connection Management**: Automatic cleanup on disconnect
✅ **Visual Indicators**: Status shows who's in voice chat
✅ **Error Handling**: Graceful fallbacks and user feedback

## Expected Behavior

1. **Starting Voice**: 🎤 → Permission → "Voice chat started" message
2. **Joining Voice**: Green notification → "Join" → Permission → "User joined" message
3. **During Chat**: Voice status indicator + ability to continue text chat
4. **Leaving**: 🔇 → "User left voice chat" message
5. **Auto-cleanup**: Voice chat ends when last person leaves

## Technical Details

- **WebRTC**: Peer-to-peer audio using RTCPeerConnection
- **Signaling**: Socket.IO events for connection setup
- **Audio**: Echo cancellation, noise suppression enabled
- **ICE Servers**: Multiple STUN servers for NAT traversal
- **Auto-play**: Handles browser policies with user interaction fallback
