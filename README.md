
# GeoSync: Peer-to-Peer Live Tracker & Group Hub

GeoSync is a decentralized, real-time social layer for small groups. Coordinate, communicate, and track locations peer-to-peer without centralized infrastructure.

## 🚀 Enhanced Features

- **P2P Group Chat**: Instant messaging synced via Gun.js. No message history is stored on any server—only on your and your friends' devices.
- **Proximity Radar**: The app automatically calculates and displays your real-time distance from every other peer in the room.
- **AI Intelligence**: Leveraging Gemini AI, get instant "Scout Reports" that analyze the group's positioning to suggest nearby meet-up spots or summarize distribution.
- **Smart Notifications**: Unread message badges and active peer status tracking.
- **Offline Resilience**:
  - **Location Caching**: View where everyone was last seen, even without an active connection.
  - **Chat Persistence**: Conversation history is cached locally so you never lose context.
  - **Auto-Sync**: Reconnects and pushes updates automatically when internet returns.

## 🛠️ Security & Privacy

- **No Servers**: Your data flows through decentralized relay nodes (like Gun Manhattan). 
- **Ephemeral**: Location data older than 10 minutes is automatically purged from the room state.
- **Local Sovereignty**: All settings and profile data stay in your browser's local storage.

## 📦 Usage

1. **Pick a Handle**: Choose a display name for the map.
2. **Sync with Friends**: Join a custom room ID or share your auto-generated link.
3. **Chat & Navigate**: Use the floating chat button to coordinate and see how far others are as you move!

---
*Built with React, Gun.js, Leaflet, and Gemini AI.*
