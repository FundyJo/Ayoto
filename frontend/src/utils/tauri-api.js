// Tauri API wrapper to replace Electron API
// This provides compatibility with the existing Electron-based code

import { invoke } from '@tauri-apps/api/core';

export const api = {
  // Window management
  minimize: () => invoke('minimize_window'),
  maximize: () => invoke('maximize_window'),
  close: () => invoke('close_window'),
  setFullscreen: (fullscreen) => invoke('set_fullscreen', { fullscreen }),
  isFullscreen: () => invoke('is_fullscreen'),
  oauth: (url) => invoke('oauth_login', { url }),
  openVlc: (command) => invoke('open_vlc', { command }),
  openAnimePahe: (url) => invoke('open_animepahe', { url }),
  windowReload: () => invoke('window_reload'),
  changeBackendPort: (port) => invoke('change_backend_port', { port }),
  openFolder: (folder) => invoke('open_folder', { path: folder }),
  changeDownloadsFolder: () => invoke('change_downloads_folder'),
  saveToSettings: (key, value) => invoke('save_to_settings', { key, value }),
  getSettingsJson: () => invoke('get_settings_json'),
  setDiscordRpc: (activityDetails) => invoke('set_discord_rpc', { activityDetails }),
  broadcastDiscordRpc: (value) => invoke('broadcast_discord_rpc', { value }),
  
  // Discord Watch Party
  discord: {
    createParty: () => invoke('discord_create_party'),
    getParty: () => invoke('discord_get_party'),
    updatePartySize: (currentSize) => invoke('discord_update_party_size', { currentSize }),
    setPartyOpen: (isOpen) => invoke('discord_set_party_open', { isOpen }),
    leaveParty: () => invoke('discord_leave_party'),
    setPartyEnabled: (enabled) => invoke('discord_set_party_enabled', { enabled }),
    getPartyInvite: () => invoke('discord_get_party_invite'),
  },
  
  // Anime4K (Rust backend)
  anime4k: {
    getPresets: () => invoke('anime4k_get_presets'),
    getPreset: (presetId) => invoke('anime4k_get_preset', { presetId }),
    getRequirements: (presetId) => invoke('anime4k_get_requirements', { presetId }),
    getConfig: () => invoke('anime4k_get_config'),
    setConfig: (enabled, presetId) => invoke('anime4k_set_config', { enabled, presetId }),
    toggle: (enabled) => invoke('anime4k_toggle', { enabled }),
    getCssFilter: () => invoke('anime4k_get_css_filter'),
    recommendPreset: (gpuInfo) => invoke('anime4k_recommend_preset', { gpuInfo }),
  },
  
  // User Profiles
  profiles: {
    getAll: () => invoke('profile_get_all'),
    get: (profileId) => invoke('profile_get', { profileId }),
    getActive: () => invoke('profile_get_active'),
    setActive: (profileId) => invoke('profile_set_active', { profileId }),
    create: (name, avatar, color) => invoke('profile_create', { name, avatar, color }),
    update: (profileId, name, avatar, color) => invoke('profile_update', { profileId, name, avatar, color }),
    updateSettings: (profileId, settings) => invoke('profile_update_settings', { profileId, settings }),
    updateLinkedAccounts: (profileId, linkedAccounts) => invoke('profile_update_linked_accounts', { profileId, linkedAccounts }),
    delete: (profileId) => invoke('profile_delete', { profileId }),
    getAvatars: () => invoke('profile_get_avatars'),
    getCount: () => invoke('profile_get_count'),
    canCreate: () => invoke('profile_can_create'),
  },
  
  // Miracast
  miracast: {
    startScan: () => invoke('miracast_start_scan'),
    stopScan: () => invoke('miracast_stop_scan'),
    getDevices: () => invoke('miracast_get_devices'),
    connect: (deviceId, quality) => invoke('miracast_connect', { deviceId, quality }),
    disconnect: () => invoke('miracast_disconnect'),
    getSession: () => invoke('miracast_get_session'),
    startCast: (videoUrl, videoTitle) => invoke('miracast_start_cast', { videoUrl, videoTitle }),
    stopCast: () => invoke('miracast_stop_cast'),
    updatePosition: (position, duration) => invoke('miracast_update_position', { position, duration }),
    setQuality: (quality) => invoke('miracast_set_quality', { quality }),
    isSupported: () => invoke('miracast_is_supported'),
    getQualityPresets: () => invoke('miracast_get_quality_presets'),
    // New connection stability commands
    heartbeat: () => invoke('miracast_heartbeat'),
    reconnect: () => invoke('miracast_reconnect'),
    reportError: (errorMessage) => invoke('miracast_report_error', { errorMessage }),
    setAutoReconnect: (enabled) => invoke('miracast_set_auto_reconnect', { enabled }),
    getConnectionHealth: () => invoke('miracast_get_connection_health'),
  },
};

// For backward compatibility - make API available on window
if (typeof window !== 'undefined') {
  window.api = api;
}

export default api;
