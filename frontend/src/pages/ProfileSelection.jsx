/**
 * ProfileSelection Page
 * Netflix-style "Who's Watching?" page for profile selection
 */

import ProfileSelector from '../components/ProfileSelector'
import { useNavigate } from 'react-router-dom'

export default function ProfileSelection() {
  const navigate = useNavigate()

  const handleProfileSelect = (profile) => {
    // Store selected profile in localStorage
    localStorage.setItem('zenshin_active_profile', JSON.stringify(profile))
    
    // Navigate to home page
    navigate('/')
  }

  return (
    <ProfileSelector 
      onProfileSelect={handleProfileSelect}
      showManageOption={true}
    />
  )
}
