
# GeoSync: Peer-to-Peer Live Tracker

GeoSync is a decentralized, real-time location sharing application that allows friends to track each other's coordinates without relying on a central server for data storage. It leverages Gun.js for peer-to-peer data synchronization and Google Gemini AI for contextual group insights.

## 🚀 Features

- **Decentralized Sync**: Powered by [Gun.js](https://gun.eco/), data is synchronized directly between peers using decentralized relay nodes.
- **Offline Resilience**:
  - **Caching**: The app automatically saves the last known positions of all peers in your room to `localStorage`.
  - **Automatic Re-sync**: When you regain internet connectivity, the app automatically pushes your latest location updates to the network.
  - **Offline UI**: Visual indicators inform you when you are viewing cached data versus live updates.
- **AI Concierge**: Uses Gemini AI to analyze your group's distribution and suggest activities or summarize the group's current status.
- **Privacy-Centric**: No central database holds your location history. Data is ephemeral and filtered out if updates are older than 10 minutes.
- **Dark Mode Map**: Beautiful, high-performance dark-themed maps using [Leaflet](https://leafletjs.com/) and CartoDB.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Map Engine**: Leaflet.js
- **P2P Database**: Gun.js
- **Intelligence**: Google Gemini API (@google/genai)
- **Icons**: Lucide React

## 📦 Getting Started

1. **Enter your Name**: This will be displayed on the map for your friends.
2. **Create/Join a Room**: Enter a custom room ID or leave it blank to generate a random one.
3. **Share the Link**: Copy the URL (containing the hash) and send it to your friends.
4. **Track Live**: Watch markers move in real-time as peers move.

## 🔒 Offline & Sync Logic

The app monitors `navigator.onLine`. 
- **While Offline**: Coordinates are still tracked via GPS and updated in the local UI state.
- **Persistence**: Every location change is mirrored to browser storage. If you refresh while offline, your friends' last known positions reappear.
- **Re-sync**: The `online` event triggers an immediate push of your current `UserLocation` object to ensure peers see your current status as soon as you reconnect.

## 📄 License

MIT - Feel free to use and modify for your own peer-to-peer location projects!
