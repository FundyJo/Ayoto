// DiscordRPC.js
// This class provides Discord Rich Presence integration using the Tauri backend.
// The actual Discord IPC connection is handled by the Rust backend.

class DiscordRPC {
  constructor(clientId) {
    this.clientId = clientId
    this.initialized = false
  }

  initialize() {
    // In Tauri, Discord RPC is initialized automatically by the backend
    // when broadcast_discord_rpc is enabled
    this.initialized = true
    if (typeof window !== 'undefined' && window.api && window.api.broadcastDiscordRpc) {
      window.api.broadcastDiscordRpc(true)
    }
  }

  setActivity(activityDetails) {
    if (!this.initialized) return
    
    if (typeof window !== 'undefined' && window.api && window.api.setDiscordRpc) {
      window.api.setDiscordRpc({
        details: activityDetails.details || 'Browsing Anime',
        state: activityDetails.state || 'Looking for anime to watch',
        ...activityDetails
      })
    }
  }

  disconnect() {
    if (typeof window !== 'undefined' && window.api && window.api.broadcastDiscordRpc) {
      window.api.broadcastDiscordRpc(false)
    }
    this.initialized = false
  }
}

export default DiscordRPC
