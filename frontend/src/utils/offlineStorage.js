/**
 * Offline Storage Service
 * Manages offline episode downloads with metadata storage
 * (anime info, episode number, watch progress, etc.)
 */

const OFFLINE_STORAGE_KEY = 'zenshin_offline_episodes'

/**
 * Get all offline episodes metadata
 * @returns {Array} Array of offline episode metadata objects
 */
export function getOfflineEpisodes() {
  try {
    const data = localStorage.getItem(OFFLINE_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading offline episodes:', error)
    return []
  }
}

/**
 * Save offline episodes metadata
 * @param {Array} episodes - Array of episode metadata objects
 */
function saveOfflineEpisodes(episodes) {
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(episodes))
  } catch (error) {
    console.error('Error saving offline episodes:', error)
  }
}

/**
 * Add a new offline episode
 * @param {Object} episodeData - Episode metadata object
 * @param {string} episodeData.animeId - Anilist anime ID
 * @param {string} episodeData.animeTitle - Anime title
 * @param {string} episodeData.animeCoverImage - Anime cover image URL
 * @param {string} episodeData.bannerImage - Anime banner image URL
 * @param {number} episodeData.episodeNumber - Episode number
 * @param {string} episodeData.episodeTitle - Episode title
 * @param {string} episodeData.fileName - Downloaded file name
 * @param {string} episodeData.filePath - Local file path
 * @param {number} episodeData.fileSize - File size in bytes
 * @param {string} episodeData.magnetUri - Original magnet URI
 * @param {boolean} episodeData.isCompressed - Whether the file is compressed
 * @returns {Object} The added episode with id
 */
export function addOfflineEpisode(episodeData) {
  const episodes = getOfflineEpisodes()
  
  // Check if episode already exists
  const existingIndex = episodes.findIndex(
    (ep) =>
      ep.animeId === episodeData.animeId &&
      ep.episodeNumber === episodeData.episodeNumber
  )
  
  const newEpisode = {
    id: `${episodeData.animeId}_${episodeData.episodeNumber}_${Date.now()}`,
    ...episodeData,
    downloadedAt: new Date().toISOString(),
    watchProgress: 0,
    lastWatchedAt: null,
    isCompleted: false
  }
  
  if (existingIndex >= 0) {
    // Update existing episode
    episodes[existingIndex] = {
      ...episodes[existingIndex],
      ...newEpisode,
      downloadedAt: episodes[existingIndex].downloadedAt // Keep original download date
    }
  } else {
    episodes.push(newEpisode)
  }
  
  saveOfflineEpisodes(episodes)
  return newEpisode
}

/**
 * Remove an offline episode
 * @param {string} episodeId - The episode ID to remove
 * @returns {boolean} Whether the removal was successful
 */
export function removeOfflineEpisode(episodeId) {
  const episodes = getOfflineEpisodes()
  const filteredEpisodes = episodes.filter((ep) => ep.id !== episodeId)
  
  if (filteredEpisodes.length !== episodes.length) {
    saveOfflineEpisodes(filteredEpisodes)
    return true
  }
  return false
}

/**
 * Get offline episodes grouped by anime
 * @returns {Object} Object with anime IDs as keys and arrays of episodes as values
 */
export function getOfflineEpisodesByAnime() {
  const episodes = getOfflineEpisodes()
  return episodes.reduce((acc, episode) => {
    if (!acc[episode.animeId]) {
      acc[episode.animeId] = {
        animeId: episode.animeId,
        animeTitle: episode.animeTitle,
        animeCoverImage: episode.animeCoverImage,
        bannerImage: episode.bannerImage,
        episodes: []
      }
    }
    acc[episode.animeId].episodes.push(episode)
    return acc
  }, {})
}

/**
 * Update watch progress for an offline episode
 * @param {string} episodeId - The episode ID
 * @param {number} progress - Watch progress (0-100)
 * @param {number} currentTime - Current playback time in seconds
 * @param {number} duration - Total duration in seconds
 */
export function updateWatchProgress(episodeId, progress, currentTime, duration) {
  const episodes = getOfflineEpisodes()
  const episodeIndex = episodes.findIndex((ep) => ep.id === episodeId)
  
  if (episodeIndex >= 0) {
    episodes[episodeIndex].watchProgress = progress
    episodes[episodeIndex].currentTime = currentTime
    episodes[episodeIndex].duration = duration
    episodes[episodeIndex].lastWatchedAt = new Date().toISOString()
    episodes[episodeIndex].isCompleted = progress >= 90
    saveOfflineEpisodes(episodes)
  }
}

/**
 * Get watch progress for an episode
 * @param {string} animeId - Anime ID
 * @param {number} episodeNumber - Episode number
 * @returns {Object|null} Watch progress data or null
 */
export function getEpisodeWatchProgress(animeId, episodeNumber) {
  const episodes = getOfflineEpisodes()
  const episode = episodes.find(
    (ep) => ep.animeId === animeId && ep.episodeNumber === episodeNumber
  )
  
  if (episode) {
    return {
      progress: episode.watchProgress,
      currentTime: episode.currentTime,
      duration: episode.duration,
      isCompleted: episode.isCompleted,
      lastWatchedAt: episode.lastWatchedAt
    }
  }
  return null
}

/**
 * Get all anime watch progress (for displaying progress in anime lists)
 * @returns {Object} Object with anime IDs and their highest watched episode
 */
export function getAllAnimeWatchProgress() {
  const episodes = getOfflineEpisodes()
  return episodes.reduce((acc, episode) => {
    if (!acc[episode.animeId] || episode.episodeNumber > acc[episode.animeId].highestWatchedEpisode) {
      const completedEpisodes = episodes
        .filter((ep) => ep.animeId === episode.animeId && ep.isCompleted)
        .length
      
      acc[episode.animeId] = {
        highestWatchedEpisode: episode.episodeNumber,
        completedEpisodes,
        totalDownloaded: episodes.filter((ep) => ep.animeId === episode.animeId).length
      }
    }
    return acc
  }, {})
}

/**
 * Mark an episode as completed
 * @param {string} episodeId - The episode ID
 */
export function markEpisodeCompleted(episodeId) {
  const episodes = getOfflineEpisodes()
  const episodeIndex = episodes.findIndex((ep) => ep.id === episodeId)
  
  if (episodeIndex >= 0) {
    episodes[episodeIndex].isCompleted = true
    episodes[episodeIndex].watchProgress = 100
    episodes[episodeIndex].lastWatchedAt = new Date().toISOString()
    saveOfflineEpisodes(episodes)
  }
}

/**
 * Get currently downloading episodes (status tracking)
 * @returns {Array} Array of episode IDs that are currently downloading
 */
export function getDownloadingEpisodes() {
  try {
    const data = localStorage.getItem('zenshin_downloading_episodes')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Add episode to downloading list
 * @param {Object} downloadInfo - Download info object
 */
export function addToDownloading(downloadInfo) {
  const downloading = getDownloadingEpisodes()
  const existingIndex = downloading.findIndex(
    (d) => d.animeId === downloadInfo.animeId && d.episodeNumber === downloadInfo.episodeNumber
  )
  
  if (existingIndex < 0) {
    downloading.push({
      ...downloadInfo,
      startedAt: new Date().toISOString()
    })
    localStorage.setItem('zenshin_downloading_episodes', JSON.stringify(downloading))
  }
}

/**
 * Remove episode from downloading list
 * @param {string} animeId - Anime ID
 * @param {number} episodeNumber - Episode number
 */
export function removeFromDownloading(animeId, episodeNumber) {
  const downloading = getDownloadingEpisodes()
  const filtered = downloading.filter(
    (d) => !(d.animeId === animeId && d.episodeNumber === episodeNumber)
  )
  localStorage.setItem('zenshin_downloading_episodes', JSON.stringify(filtered))
}

/**
 * Get total storage used by offline episodes
 * @returns {number} Total size in bytes
 */
export function getTotalStorageUsed() {
  const episodes = getOfflineEpisodes()
  return episodes.reduce((total, ep) => total + (ep.fileSize || 0), 0)
}

/**
 * Clear all offline episodes data
 */
export function clearAllOfflineData() {
  localStorage.removeItem(OFFLINE_STORAGE_KEY)
  localStorage.removeItem('zenshin_downloading_episodes')
}

export default {
  getOfflineEpisodes,
  addOfflineEpisode,
  removeOfflineEpisode,
  getOfflineEpisodesByAnime,
  updateWatchProgress,
  getEpisodeWatchProgress,
  getAllAnimeWatchProgress,
  markEpisodeCompleted,
  getDownloadingEpisodes,
  addToDownloading,
  removeFromDownloading,
  getTotalStorageUsed,
  clearAllOfflineData
}
