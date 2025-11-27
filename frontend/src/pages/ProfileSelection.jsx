/**
 * ProfileSelection Page
 * Netflix-style "Who's Watching?" page for profile selection
 */

import ProfileSelector from '../components/ProfileSelector'
import { useNavigate } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { useZenshinContext } from '../utils/ContextProvider'

export default function ProfileSelection() {
  const navigate = useNavigate()
  const { setActiveProfile } = useZenshinContext()

  const handleProfileSelect = (profile) => {
    // Store selected profile in localStorage
    localStorage.setItem('zenshin_active_profile', JSON.stringify(profile))
    
    // Update the context with the selected profile
    setActiveProfile(profile)
    
    // Navigate to home page
    navigate('/')
  }

  const handleSkip = () => {
    // Clear any active profile when skipping
    localStorage.removeItem('zenshin_active_profile')
    setActiveProfile(null)
    
    // Navigate to home page
    navigate('/')
  }

  return (
    <Theme appearance="dark">
      <ProfileSelector 
        onProfileSelect={handleProfileSelect}
        showManageOption={true}
        onSkip={handleSkip}
      />
    </Theme>
  )
}
