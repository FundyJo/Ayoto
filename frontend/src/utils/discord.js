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

/**
 * Create a Discord watch party to enable "invite to activity" feature
 * Call this when the user starts watching content
 * @returns {Promise<void>}
 */
export async function setupDiscordWatchParty() {
  try {
    if (typeof window !== 'undefined' && window.api?.discord?.createParty) {
      await window.api.discord.createParty()
      console.log('Discord watch party created')
    }
  } catch (error) {
    console.error('Failed to create Discord watch party:', error)
  }
}

/**
 * Clean up Discord watch party when the user stops watching
 * Call this when exiting the player or component
 * @returns {Promise<void>}
 */
export async function cleanupDiscordWatchParty() {
  try {
    if (typeof window !== 'undefined' && window.api?.discord?.leaveParty) {
      await window.api.discord.leaveParty()
      console.log('Discord watch party left')
    }
  } catch (error) {
    console.error('Failed to leave Discord watch party:', error)
  }
}

export default DiscordRPC
