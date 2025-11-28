import SearchBar from './SearchBar'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import zenshinLogo from '../assets/zenshinLogo.png'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  DividerVerticalIcon,
  DownloadIcon,
  GearIcon,
  PersonIcon,
  MixIcon,
  AvatarIcon
} from '@radix-ui/react-icons'
import Pikacon from '../assets/pikacon.ico'
import { Button, DropdownMenu } from '@radix-ui/themes'
import { anilistAuthUrl } from '../utils/auth'
import { useEffect, useState } from 'react'
import useGetAnilistProfile from '../hooks/useGetAnilistProfile'
import { toast } from 'sonner'
import AnimePaheSearchBar from '../extensions/animepahe/components/AnimePaheSearchBar'
import AniListLogo from '../assets/symbols/AniListLogo'
import { useZenshinContext } from '../utils/ContextProvider'
import DownloadMeter from './DownloadMeter'
import { AVATAR_COLORS } from './ProfileSelector'

export default function Header() {
  const navigate = useNavigate()
  const { setUserId, settings, activeProfile, setActiveProfile } = useZenshinContext()
  const [profiles, setProfiles] = useState([])

  /* -------------------- ANILIST AUTH -------------------- */
  const [anilistToken, setAnilistToken] = useState(localStorage.getItem('anilist_token') || '')

  useEffect(() => {
    // TODO: Implement Tauri deep link handling
    // Tauri v2 uses tauri-plugin-deep-link which needs to be configured
    // For now, deep links will be handled through the Rust backend
    // window.electron.receiveDeeplink((deeplink) => {
    //   const arr = deeplink.split('#')
    //   const hash = arr[1]
    //   const params = new URLSearchParams(hash)
    //   const accessToken = params.get('access_token')
    //   if (accessToken) {
    //     localStorage.setItem('anilist_token', accessToken)
    //     window.location.reload()
    //   }
    // })
  }, [])

  const {
    isLoading,
    data: userProfile,
    error: userProfileError,
    status
  } = useGetAnilistProfile(anilistToken)

  useEffect(() => {
    if (userProfile) {
      setUserId(userProfile.id)
    }
  }, [userProfile])

  // console.log('anilistToken: ', anilistToken)

  const handleLogin = () => {
    // window.location.href = anilistAuthUrl
    // shell.openExternal(anilistAuthUrl)
    window.api.oauth(anilistAuthUrl)
  }

  const handleLogout = () => {
    localStorage.removeItem('anilist_token')
    localStorage.removeItem('anilist_id')
    localStorage.removeItem('anilist_name')
    setAnilistToken('')
    setUserId('')

    // refresh the page
    window.location.reload()
  }

  if (userProfileError) {
    toast.error('Error fetching AniList Profile', {
      description: userProfileError?.message,
      classNames: {
        title: 'text-rose-500'
      }
    })
  }

  // Load profiles for the switcher
  useEffect(() => {
    const loadProfiles = async () => {
      if (!window.api?.profiles) {
        // Profile API not available (development mode without Tauri)
        return
      }
      try {
        const allProfiles = await window.api.profiles.getAll()
        setProfiles(allProfiles)
      } catch (error) {
        console.error('Failed to load profiles from backend:', error)
      }
    }
    loadProfiles()
  }, [])

  // Handle profile switch
  const handleProfileSwitch = async (profile) => {
    try {
      if (window.api?.profiles) {
        await window.api.profiles.setActive(profile.id)
      }
      setActiveProfile(profile)
      localStorage.setItem('zenshin_active_profile', JSON.stringify(profile))
      toast.success(`Switched to ${profile.name}`)
    } catch (error) {
      console.error('Failed to switch profile:', error)
      toast.error('Failed to switch profile')
    }
  }

  // get current route and check if it is /animepahe
  const { pathname } = useLocation()

  const animepahe = pathname.includes('/animepahe')

  return (
    <div className="draggable sticky top-0 z-50 flex h-11 items-center justify-between border-[#5a5e6750] bg-[#111113] bg-opacity-60 px-4 py-3 backdrop-blur-md">
      <div className="nodrag flex items-center justify-center gap-x-2">
        <Link
          className="nodrag hover: font-spaceMono flex w-fit cursor-pointer select-none gap-x-2 rounded-sm p-1 text-sm transition-all duration-200 hover:bg-[#70707030]"
          to={'/'}
        >
          <img src={zenshinLogo} alt="" className="w-16" />
        </Link>
        {/* <DividerVerticalIcon width={20} height={20} color="#ffffff40" /> */}
        {/* <a className="nodrag" href="https://github.com/hitarth-gg" target="_blank" rel="noreferrer">
          <Button color="gray" variant="ghost" size={'1'}>
            <GitHubLogoIcon className="my-1" width={17} height={17} />
          </Button>
        </a> */}

        <DividerVerticalIcon width={20} height={20} color="#ffffff40" />
        <div className="flex gap-4">
          <Button color="gray" variant="ghost" size={'1'} onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="my-1" width={16} height={16} />
          </Button>
          <Button color="gray" variant="ghost" size={'1'} onClick={() => navigate(1)}>
            <ArrowRightIcon className="my-1" width={16} height={16} />
          </Button>
        </div>
        <DividerVerticalIcon width={20} height={20} color="#ffffff40" />
        <Link to="/newreleases">
          <Button className="nodrag" color="gray" variant="soft" size={'1'}>
            {/* <div className="p-1 font-space-mono text-[.8rem]">New Releases</div> */}
            <div className="font-space-mono text-[.8rem]">New</div>
          </Button>
        </Link>
        {/* <DividerVerticalIcon width={20} height={20} color="#ffffff40" /> */}
        <Button
          className="nodrag"
          size="1"
          color="gray"
          variant="soft"
          onClick={() => navigate('/animepahe')}
        >
          {/* <DashboardIcon /> */}
          <img src={Pikacon} alt="pikacon" className="h-4 w-4" />
        </Button>

        {/* <DividerVerticalIcon width={20} height={20} color="#ffffff40" /> */}

        <Button
          className="nodrag"
          size="1"
          color="gray"
          variant="soft"
          onClick={() => navigate('/anilist')}
          style={{
            padding: '0 .4rem'
          }}
        >
          {/* <DashboardIcon /> */}
          <AniListLogo style="h-5 w-5" />
        </Button>
        
        {/* Watchlist Button - visible when logged in */}
        {userProfile && (
          <Button
            className="nodrag"
            size="1"
            color="blue"
            variant="soft"
            onClick={() => navigate('/bookmarks')}
          >
            <BookmarkIcon />
            <span className="font-space-mono text-[.8rem]">Watchlist</span>
          </Button>
        )}
      </div>

      <div className="nodrag mx-5 w-2/6">{animepahe ? <AnimePaheSearchBar /> : <SearchBar />}</div>
      <div className="nodrag mr-36 flex items-center justify-center gap-x-4">
        <Button color="gray" variant="soft" size={'1'} onClick={() => navigate('/downloads')}>
          <DownloadIcon />
        </Button>
        <Button color="gray" variant="soft" size={'1'} onClick={() => navigate('/plugins')}>
          <MixIcon />
        </Button>
        <DownloadMeter />

        {true && (
          <DropdownMenu.Root className="nodrag" modal={false}>
            <DropdownMenu.Trigger>
              <Button variant="ghost" color="gray">
                <div className="flex animate-fade items-center gap-x-2">
                  {userProfile ? (
                    <img
                      src={userProfile.avatar.large}
                      alt="avatar"
                      className="h-6 w-6 rounded-full"
                    />
                  ) : activeProfile ? (
                    <div
                      className="h-6 w-6 rounded-sm flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: AVATAR_COLORS[activeProfile.avatar]?.bg || '#3b82f6' }}
                    >
                      {activeProfile.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  ) : (
                    <PersonIcon className="my-1" width={16} height={16} />
                  )}
                  <div className="font-space-mono text-[.8rem]">
                    {userProfile?.name || activeProfile?.name || 'Anonuser'}
                  </div>
                </div>
                <DropdownMenu.TriggerIcon className="ml-1" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {/* Profile Switching - Who's Watching */}
              {profiles.length > 0 && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <div className="flex items-center gap-x-2">
                      {activeProfile ? (
                        <div
                          className="h-4 w-4 rounded-sm flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: AVATAR_COLORS[activeProfile.avatar]?.bg || '#3b82f6' }}
                        >
                          {activeProfile.name?.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <AvatarIcon className="my-1" width={14} height={14} />
                      )}
                      Who&apos;s Watching
                    </div>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    {profiles.map((profile) => (
                      <DropdownMenu.Item
                        key={profile.id}
                        onClick={() => handleProfileSwitch(profile)}
                        color={activeProfile?.id === profile.id ? 'blue' : 'gray'}
                      >
                        <div className="flex items-center gap-x-2">
                          <div
                            className="h-4 w-4 rounded-sm flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: AVATAR_COLORS[profile.avatar]?.bg || '#3b82f6' }}
                          >
                            {profile.name?.charAt(0).toUpperCase()}
                          </div>
                          {profile.name}
                          {profile.isMain && <span className="text-xs text-gray-500">(Main)</span>}
                        </div>
                      </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onClick={() => navigate('/bookmarks')}
                      shortcut={<BookmarkIcon />}
                    >
                      Watchlist
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onClick={() => navigate('/profiles')}
                      shortcut={<GearIcon />}
                    >
                      Manage Profiles
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
              )}
              {profiles.length === 0 && (
                <DropdownMenu.Item onClick={() => navigate('/profiles')}>
                  <div className="flex items-center gap-x-2">
                    <AvatarIcon className="my-1" width={14} height={14} />
                    Who&apos;s Watching
                  </div>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onClick={() => window.api.openFolder(settings.downloadsFolderPath)}
                shortcut={<DownloadIcon />}
              >
                Downloads
              </DropdownMenu.Item>
              {userProfile && (
                <DropdownMenu.Item
                  onClick={() => navigate('/bookmarks')}
                  shortcut={<BookmarkIcon />}
                >
                  Watchlist
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item
                color="gray"
                onClick={() => navigate('/settings')}
                shortcut={<GearIcon />}
              >
                Settings
              </DropdownMenu.Item>
              {/* <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item>Move to project…</DropdownMenu.Item>
                  <DropdownMenu.Item>Move to folder…</DropdownMenu.Item>

                  <DropdownMenu.Separator />
                  <DropdownMenu.Item>Advanced options…</DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub> */}
              <DropdownMenu.Separator />
              {userProfile ? (
                <DropdownMenu.Item color="red" onClick={handleLogout}>
                  Logout
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item color="green" onClick={handleLogin}>
                  Login With AniList
                </DropdownMenu.Item>
              )}
              {/* <Button color='gray' onClick={() => navigate('/test')}>Test</Button> */}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}

        {/* <Link target="_blank" to="https://github.com/hitarth-gg/zenshin"> */}
        {/* <Button color="gray" variant="ghost" size={'1'}> */}
        {/* <div className="p-1 text-[.8rem]">How to use</div> */}
        {/* </Button> */}
        {/* </Link> */}
        {/* <Button
          className="nodrag"
          color="gray"
          variant="ghost"
          size={'1'}
          // onClick={() => toggleGlow()}
          onClick={() => navigate('/settings')}
          style={{
            padding: '0 1rem'
          }}
        >
          <GearIcon className="my-1 cursor-pointer" width={16} height={16} />
        </Button> */}
      </div>
    </div>
  )
}
