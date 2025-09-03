# Voice Chat Feature Documentation

## Overview

The voice chat feature allows users in a Watch Together room to communicate via voice in real-time while watching videos together. This feature uses WebRTC for peer-to-peer audio communication and Socket.IO for signaling.

## How It Works

### For Any User (Including Host):

1. **Starting Voice Chat**: Click the microphone button (🎤) between the message input and send button
2. **Browser Permission**: Grant microphone access when prompted
3. **Notification**: All other users in the room will see a notification: "User X started Voice chat, want to join?"
4. **System Message**: A system message appears in chat: "User X started a voice chat"

### For Other Users:

1. **Join Notification**: When someone starts voice chat, you'll see a green notification with a "Join" button
2. **Joining**: Click "Join" to enter the voice chat (requires microphone permission)
3. **System Message**: A system message appears: "User X joined the voice chat"

### Voice Chat Controls:

- **🎤 (Start)**: Start a new voice chat session
- **🔊 (Join)**: Join an existing voice chat (appears when someone else starts)
- **🔇 (Leave)**: Leave the current voice chat

### Visual Indicators:

- **Active Voice Chat**: A status indicator shows who's currently in the voice chat
- **Loading Spinner**: Shows ⏳ while requesting microphone access
- **Color-coded Names**: User names appear in their assigned colors

## Technical Implementation

### Client-Side Components:

- `VoiceChat.js`: Main voice chat component handling WebRTC connections
- `GroupChatSection.js`: Updated to include voice chat button and notifications
- Voice chat button positioned between message input and send button

### Server-Side Events:

- `start-voice-chat`: Initiates a new voice chat session
- `join-voice-chat`: Adds a user to existing voice chat
- `leave-voice-chat`: Removes a user from voice chat
- WebRTC signaling events: `voice-offer`, `voice-answer`, `voice-ice-candidate`

### Features:

- **Real-time Audio**: Peer-to-peer voice communication using WebRTC
- **Automatic Cleanup**: Voice chat ends when all participants leave
- **Disconnect Handling**: Properly handles user disconnections
- **Chat Integration**: System messages for voice chat events
- **Notifications**: Visual notifications for voice chat invitations

### Audio Features:

- Echo cancellation
- Noise suppression
- Automatic gain control
- Auto-play for remote audio streams

## User Experience

### Starting Voice Chat:

1. User clicks the microphone button
2. Browser requests microphone permission
3. Voice chat starts and notification sent to others
4. System message appears in chat

### Joining Voice Chat:

1. User sees green notification when someone starts voice chat
2. Clicks "Join" button
3. Browser requests microphone permission
4. WebRTC connection established with all participants
5. System message appears in chat

### During Voice Chat:

- Status indicator shows active participants
- Users can continue chatting via text
- Voice chat button shows "leave" option (🔇)

### Ending Voice Chat:

- Users can leave individually
- Voice chat automatically ends when no participants remain
- System message announces the end

## Browser Compatibility

- Requires modern browsers with WebRTC support
- HTTPS required for microphone access in production
- Tested on Chrome, Firefox, Safari, and Edge

## Security & Privacy

- Peer-to-peer audio communication (no server recording)
- Microphone access requires explicit user permission
- Audio streams are automatically cleaned up on disconnect

## Troubleshooting

### Common Issues:

1. **Microphone Permission Denied**:

   - Check browser settings for microphone access
   - Ensure HTTPS in production

2. **No Audio**:

   - Check microphone is not muted
   - Verify other participants joined successfully
   - Check browser audio settings

3. **Connection Issues**:
   - Firewall may block WebRTC connections
   - Try refreshing the page
   - Check internet connection stability

### Development Notes:

- Uses STUN servers for NAT traversal
- Graceful fallback for connection failures
- Automatic retry mechanisms for failed connections

## Future Enhancements

- Push-to-talk functionality
- Mute/unmute controls
- Voice activity indicators
- Audio quality settings
- Recording capabilities (with consent)
