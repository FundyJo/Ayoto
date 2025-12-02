/**
 * React hook for loading images that may need CORS proxy
 * 
 * Uses Tauri's HTTP plugin to fetch images from CORS-restricted domains
 * and converts them to data URLs for display.
 */

import { useState, useEffect, useRef } from 'react'
import { needsProxy, fetchProxiedImage } from '../utils/imageProxy'

/**
 * Hook to load a potentially CORS-restricted image
 * @param {string} url - The image URL to load
 * @returns {{src: string, isLoading: boolean, error: Error|null}} 
 *   - src: The URL to use (original or data URL)
 *   - isLoading: Whether the image is being fetched
 *   - error: Any error that occurred
 */
export function useProxiedImage(url) {
  const [src, setSrc] = useState(url)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    // Reset state when URL changes
    setSrc(url)
    setError(null)

    // If URL doesn't need proxying, use it directly
    if (!url || !needsProxy(url)) {
      setIsLoading(false)
      return
    }

    // Fetch the image using Tauri's HTTP plugin
    setIsLoading(true)
    
    fetchProxiedImage(url)
      .then((dataUrl) => {
        if (isMountedRef.current) {
          setSrc(dataUrl)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.warn('Failed to proxy image:', err)
          setError(err)
          setIsLoading(false)
          // Keep original URL as fallback
        }
      })

    return () => {
      isMountedRef.current = false
    }
  }, [url])

  return { src, isLoading, error }
}

/**
 * Hook to load multiple potentially CORS-restricted images
 * @param {string[]} urls - Array of image URLs to load
 * @returns {{sources: Object<string, string>, isLoading: boolean}}
 *   - sources: Map of original URL to loaded URL (original or data URL)
 *   - isLoading: Whether any images are still being fetched
 */
export function useProxiedImages(urls) {
  const [sources, setSources] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    if (!urls || urls.length === 0) {
      setSources({})
      setIsLoading(false)
      return
    }

    // Initialize with original URLs
    const initialSources = {}
    const urlsToFetch = []
    
    for (const url of urls) {
      if (!url) continue
      initialSources[url] = url
      if (needsProxy(url)) {
        urlsToFetch.push(url)
      }
    }
    
    setSources(initialSources)

    if (urlsToFetch.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    
    // Fetch all images in parallel
    Promise.all(
      urlsToFetch.map(async (url) => {
        try {
          const dataUrl = await fetchProxiedImage(url)
          return { url, dataUrl }
        } catch (err) {
          console.warn('Failed to proxy image:', url, err)
          return { url, dataUrl: url } // Fallback to original
        }
      })
    ).then((results) => {
      if (isMountedRef.current) {
        setSources((prev) => {
          const updated = { ...prev }
          for (const { url, dataUrl } of results) {
            updated[url] = dataUrl
          }
          return updated
        })
        setIsLoading(false)
      }
    })

    return () => {
      isMountedRef.current = false
    }
  }, [JSON.stringify(urls)]) // Use JSON.stringify for array comparison

  return { sources, isLoading }
}

export default useProxiedImage
