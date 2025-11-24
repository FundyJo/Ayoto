const DEFAULT_PORT = 64621
let BASE_URL = `http://localhost:${DEFAULT_PORT}/animepahe`

async function getBaseUrl() {
  // Only try to get settings if window.api is available (Tauri context)
  if (typeof window !== 'undefined' && window.api && typeof window.api.getSettingsJson === 'function') {
    try {
      const response = await window.api.getSettingsJson()
      if (response && response.backendPort) {
        return `http://localhost:${response.backendPort}/animepahe`
      }
    } catch {
      // Silently fall back to default if API fails
    }
  }
  return BASE_URL
}

export const animepaheLatest = async (page = 1) => {
  const baseUrl = await getBaseUrl()
  const response = await fetch(`${baseUrl}/latest?page=${page}`)
  return response.json()
}
export const animepaheDetails = async (page = 1) => {
  const baseUrl = await getBaseUrl()
  const response = await fetch(`${baseUrl}/details?id=${page}`)
  return response.json()
}

export const animepaheEpisodes = async (id, page = 1) => {
  const baseUrl = await getBaseUrl()
  const response = await fetch(`${baseUrl}/getallepisodes?id=${id}`)
  const data = await response.json()
  return { data: data.episodes }
}
export const animepaheEpisodesOfPage = async (id, page = 1) => {
  const baseUrl = await getBaseUrl()
  const response = await fetch(`${baseUrl}/getepisodesofpage?id=${id}&page=${page}`)
  const data = await response.json()
  return { data: data.episodes }
}

export const animepahePlay = async (id, episode) => {
  const baseUrl = await getBaseUrl()
  const response = await fetch(`${baseUrl}/play?id=${id}&episode=${episode}`)
  return response.json()
}

export const animepaheSearch = async (query) => {
  const baseUrl = await getBaseUrl()
  const response = await fetch(`${baseUrl}/search?q=${query}`)
  return response.json()
}
