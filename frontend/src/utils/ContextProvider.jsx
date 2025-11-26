import { createContext, useContext, useEffect, useState } from 'react'
import { isTruthyWithZero } from '../../../common/utils'

const ZenshinContext = createContext()

export function useZenshinContext() {
  const context = useContext(ZenshinContext)
  if (context === undefined) {
    throw new Error('useZenshinContext must be used within a ZenshinProvider')
  }
  return context
}

export default function ZenshinProvider({ children }) {
  const [glow, setGlow] = useState(true)
  const [vlcPath, setVlcPath] = useState('"C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"')
  const [autoUpdateAnilistEpisode, setAutoUpdateAnilistEpisode] = useState(true)
  const [scrollOpacity, setScrollOpacity] = useState(false)
  const [hideHero, setHideHero] = useState(false)
  const [userId, setUserId] = useState('')
  const [checkForUpdates, setCheckForUpdates] = useState(true)
  const [backendPort, setBackendPort] = useState(64621)
  const [broadcastDiscordRpc, setBroadcastDiscordRpc] = useState(false)
  const [hoverCard, setHoverCard] = useState(true)
  const [settings, setSettings] = useState({})
  const [smoothScroll, setSmoothScroll] = useState(true)
  const [uploadLimit, setUploadLimit] = useState(-1)
  const [downloadLimit, setDownloadLimit] = useState(-1)
  const [plugins, setPlugins] = useState([])
  const [showProfileSelectionAtStartup, setShowProfileSelectionAtStartup] = useState(false)
  const [activeProfile, setActiveProfile] = useState(null)

  useEffect(() => {
    const glow = localStorage.getItem('glow')
    if (glow) {
      setGlow(glow === 'true')
    }

    const vlcPath = localStorage.getItem('vlcPath')
    if (vlcPath) {
      setVlcPath(vlcPath)
    }

    const autoUpdateAnilistEpisode = localStorage.getItem('autoUpdateAnilistEpisode')
    if (autoUpdateAnilistEpisode) {
      setAutoUpdateAnilistEpisode(autoUpdateAnilistEpisode === 'true')
    }

    const scrollOpacity = localStorage.getItem('scrollOpacity')
    if (scrollOpacity) {
      setScrollOpacity(scrollOpacity === 'true')
    }

    const hideHero = localStorage.getItem('hideHero')
    if (hideHero) {
      setHideHero(hideHero === 'true')
    }

    const updateCheck = localStorage.getItem('checkForUpdates')
    if (updateCheck) {
      setCheckForUpdates(updateCheck === 'true')
    }

    // getSettingsJson
    const getSettingsJson = async () => {
      // Only try to get settings if window.api is available (Tauri context)
      if (typeof window === 'undefined' || !window.api || typeof window.api.getSettingsJson !== 'function') {
        return
      }
      try {
        const settings = await window.api.getSettingsJson()
        if (settings.backendPort) {
          setBackendPort(settings.backendPort)
        }
        if (settings.broadcastDiscordRpc) {
          setBroadcastDiscordRpc(settings.broadcastDiscordRpc)
        }
        if (isTruthyWithZero(settings.uploadLimit) && settings.uploadLimit !== -1) {
          setUploadLimit(parseInt(settings.uploadLimit) / 1024)
        }
        if (isTruthyWithZero(settings.downloadLimit) && settings.downloadLimit !== -1) {
          setDownloadLimit(parseInt(settings.downloadLimit) / 1024)
        }
        setSettings(settings)
      } catch {
        // Silently fail if API is not available
      }
    }

    const animateHoverCard = localStorage.getItem('hoverCard')
    if (animateHoverCard) {
      setHoverCard(animateHoverCard === 'true')
    }

    const smoothScroll = localStorage.getItem('smoothScroll')
    if (smoothScroll && smoothScroll === 'false') {
      setSmoothScroll(smoothScroll === 'false')
    }

    // Load plugins from localStorage
    try {
      const storedPlugins = localStorage.getItem('zenshin_plugins')
      if (storedPlugins) {
        setPlugins(JSON.parse(storedPlugins))
      }
    } catch (e) {
      console.error('Error loading plugins:', e)
    }

    // Load profile selection at startup setting
    const profileSelectionSetting = localStorage.getItem('showProfileSelectionAtStartup')
    if (profileSelectionSetting) {
      setShowProfileSelectionAtStartup(profileSelectionSetting === 'true')
    }

    // Load active profile from localStorage
    try {
      const storedActiveProfile = localStorage.getItem('zenshin_active_profile')
      if (storedActiveProfile) {
        setActiveProfile(JSON.parse(storedActiveProfile))
      }
    } catch (e) {
      console.error('Error loading active profile:', e)
    }

    getSettingsJson()
  }, [])

  return (
    <ZenshinContext.Provider
      value={{
        glow,
        setGlow,
        vlcPath,
        setVlcPath,
        autoUpdateAnilistEpisode,
        setAutoUpdateAnilistEpisode,
        scrollOpacity,
        setScrollOpacity,
        hideHero,
        setHideHero,
        userId,
        setUserId,
        checkForUpdates,
        setCheckForUpdates,
        backendPort,
        setBackendPort,
        broadcastDiscordRpc,
        setBroadcastDiscordRpc,
        hoverCard,
        setHoverCard,
        settings,
        setSettings,
        smoothScroll,
        setSmoothScroll,
        uploadLimit,
        setUploadLimit,
        downloadLimit,
        setDownloadLimit,
        plugins,
        setPlugins,
        showProfileSelectionAtStartup,
        setShowProfileSelectionAtStartup,
        activeProfile,
        setActiveProfile
      }}
    >
      {children}
    </ZenshinContext.Provider>
  )
}
