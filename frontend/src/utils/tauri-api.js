// Tauri API wrapper to replace Electron API
// This provides compatibility with the existing Electron-based code

import { invoke } from '@tauri-apps/api/core';

export const api = {
  minimize: () => invoke('minimize_window'),
  maximize: () => invoke('maximize_window'),
  close: () => invoke('close_window'),
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
  broadcastDiscordRpc: (value) => invoke('broadcast_discord_rpc', { value })
};

// For backward compatibility - make API available on window
if (typeof window !== 'undefined') {
  window.api = api;
}

export default api;
