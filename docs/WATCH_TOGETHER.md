# Watch Together Feature Documentation

## Overview

Watch Together (Synchronisiertes Gemeinsam Schauen) allows multiple users to watch anime together in sync. This document explains different implementation approaches and their trade-offs.

## Implementation Approaches

### 1. Server-Based Synchronization (Traditional)

The most common approach uses a central server to coordinate playback:

**How it works:**
- A central server maintains the "source of truth" for playback state
- All clients connect to the server and receive sync commands
- One user acts as the "host" and controls playback
- The server broadcasts play/pause/seek events to all connected clients

**Pros:**
- Reliable synchronization
- Works across NAT and firewalls
- Simple client implementation
- Can support many users

**Cons:**
- Requires hosting and maintaining a server
- Single point of failure
- Potential latency issues
- Ongoing costs for server infrastructure

### 2. Peer-to-Peer (P2P) - Serverless Approach

It is possible to implement Watch Together without a central server using WebRTC (Web Real-Time Communication).

**How it works:**
1. **WebRTC Data Channels**: Browsers can establish direct peer-to-peer connections
2. **Signaling Server (Minimal)**: Still needed initially to help peers discover each other, but can be very lightweight
3. **STUN/TURN Servers**: Help with NAT traversal (many free public servers available)

#### Fully P2P Implementation with WebRTC

```javascript
// Simplified example of P2P sync using WebRTC
class WatchTogetherP2P {
  constructor() {
    this.peerConnection = null
    this.dataChannel = null
    this.isHost = false
  }

  // Create a room (as host)
  async createRoom() {
    this.isHost = true
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Free Google STUN server
      ]
    })
    
    this.dataChannel = this.peerConnection.createDataChannel('sync')
    this.setupDataChannel()
    
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    
    // Return offer to share with peer (via QR code, link, etc.)
    return this.peerConnection.localDescription
  }

  // Join a room (as guest)
  async joinRoom(offer) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    })
    
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel
      this.setupDataChannel()
    }
    
    await this.peerConnection.setRemoteDescription(offer)
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    
    return this.peerConnection.localDescription
  }

  // Sync playback state
  syncPlayback(state) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        type: 'sync',
        currentTime: state.currentTime,
        playing: state.playing,
        timestamp: Date.now()
      }))
    }
  }

  setupDataChannel() {
    this.dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'sync') {
        // Adjust for network latency
        const latency = (Date.now() - data.timestamp) / 1000
        this.applySync(data.currentTime + latency, data.playing)
      }
    }
  }
}
```

### 3. Hybrid Approach (Recommended)

Combine minimal signaling server with P2P data channels:

**Components:**
1. **Signaling Service**: A simple WebSocket server (or even Discord's API) for initial connection
2. **P2P Data Channels**: WebRTC for actual sync messages
3. **Fallback**: Server-relay if P2P fails

## Discord Integration

### Discord Rich Presence

Ayoto already supports Discord Rich Presence. This can be extended for Watch Together:

```javascript
// Example: Using Discord's Rich Presence for invites
const activity = {
  details: 'Watching Anime Together',
  state: 'Attack on Titan - Episode 1',
  party: {
    id: 'unique-room-id',
    size: [2, 5] // current/max participants
  },
  secrets: {
    join: 'room-connection-data',
    spectate: 'spectate-data'
  }
}
```

### Discord Activity Invite

Discord's "Ask to Join" feature can be used:

1. Host creates a watch session
2. Discord Rich Presence shows "Ask to Join" button
3. Friend clicks to join
4. App receives join request with connection data
5. P2P connection established

## Libraries for P2P Implementation

### Recommended Libraries

1. **simple-peer** (npm: `simple-peer`)
   - Simplified WebRTC wrapper
   - Easy data channel setup
   - Good browser support

2. **PeerJS** (npm: `peerjs`)
   - High-level abstraction over WebRTC
   - Free signaling server included (or self-host)
   - Simple API

3. **Trystero** (npm: `trystero`)
   - Serverless WebRTC
   - Uses BitTorrent trackers for signaling (no server needed!)
   - Good for fully decentralized setup

### Example with Trystero (Fully Serverless)

```javascript
import { joinRoom } from 'trystero'

// No server needed - uses BitTorrent trackers
const room = joinRoom({ appId: 'ayoto-watch-together' }, 'my-room-id')

// Send sync data
const [sendSync, getSync] = room.makeAction('sync')

// Receive sync from others
getSync((data, peerId) => {
  console.log(`Peer ${peerId} is at ${data.currentTime}s`)
  // Sync your player to match
})

// Broadcast your state
sendSync({ currentTime: player.currentTime, playing: !player.paused })
```

## Implementation Considerations

### Latency Compensation

```javascript
// Account for network delay
function calculateAdjustedTime(remoteTime, messageTimestamp) {
  const roundTripTime = Date.now() - messageTimestamp
  const oneWayLatency = roundTripTime / 2
  return remoteTime + (oneWayLatency / 1000)
}
```

### Sync Threshold

```javascript
// Only sync if drift is significant (avoid constant adjusting)
const SYNC_THRESHOLD = 0.5 // seconds

function shouldSync(localTime, remoteTime) {
  return Math.abs(localTime - remoteTime) > SYNC_THRESHOLD
}
```

### Host Authority

```javascript
// Host is the source of truth
class SyncManager {
  constructor(isHost) {
    this.isHost = isHost
  }

  onPlayPause(playing) {
    if (this.isHost) {
      this.broadcast({ type: 'playPause', playing, time: player.currentTime })
    }
  }

  onSeek(time) {
    if (this.isHost) {
      this.broadcast({ type: 'seek', time })
    }
  }

  onRemoteSync(data) {
    if (!this.isHost) {
      // Guests follow host's commands
      player.currentTime = data.time
      data.playing ? player.play() : player.pause()
    }
  }
}
```

## Conclusion

**Can Watch Together work without a central server?**

**Yes!** Using WebRTC with libraries like Trystero, you can achieve fully peer-to-peer synchronization without any server infrastructure. The only requirement is an initial way to exchange connection information (signaling), which can be done through:

- Discord Rich Presence (built into Ayoto)
- QR codes
- Copy/paste room codes
- BitTorrent trackers (Trystero approach)

## Recommended Implementation Steps

1. **Phase 1**: Add WebRTC-based P2P sync with room codes
2. **Phase 2**: Integrate with Discord Rich Presence for "Ask to Join"
3. **Phase 3**: Add Trystero for fully serverless option
4. **Phase 4**: Implement latency compensation and robust sync

## Resources

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [simple-peer](https://github.com/feross/simple-peer)
- [PeerJS](https://peerjs.com/)
- [Trystero](https://github.com/dmotz/trystero)
- [Discord Rich Presence](https://discord.com/developers/docs/rich-presence/how-to)
