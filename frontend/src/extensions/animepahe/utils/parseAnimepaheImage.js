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

// convert the image URL to the localhost animepahe image URL
export const parseAnimepaheImage = (url) => {
  // if the url is a poster image
  if (url && url.includes('poster')) {
    const id = url.split('/').pop()
    return `${BASE_URL}/image/poster/${id}`
  }

  // if the url is a snapshot image
  if (url && url.includes('snapshot')) {
    const id = url.split('/').pop()
    return `${BASE_URL}/image/snapshot/${id}`
  }
}

// Async version for when we need to ensure correct port
export const parseAnimepaheImageAsync = async (url) => {
  const baseUrl = await getBaseUrl()
  
  // if the url is a poster image
  if (url && url.includes('poster')) {
    const id = url.split('/').pop()
    return `${baseUrl}/image/poster/${id}`
  }

  // if the url is a snapshot image
  if (url && url.includes('snapshot')) {
    const id = url.split('/').pop()
    return `${baseUrl}/image/snapshot/${id}`
  }
}
