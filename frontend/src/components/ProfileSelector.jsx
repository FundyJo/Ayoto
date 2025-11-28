/**
 * ProfileSelector Component
 * Netflix-style "Who's Watching?" profile selection screen
 */

import { useState, useEffect } from 'react'
import { Button, TextField } from '@radix-ui/themes'
import { 
  PlusIcon, 
  Pencil1Icon, 
  TrashIcon, 
  CheckIcon,
  Cross2Icon
} from '@radix-ui/react-icons'
import { toast } from 'sonner'

// Avatar color mapping
const AVATAR_COLORS = {
  avatar_red: { bg: '#ef4444', text: 'R' },
  avatar_blue: { bg: '#3b82f6', text: 'B' },
  avatar_green: { bg: '#22c55e', text: 'G' },
  avatar_purple: { bg: '#a855f7', text: 'P' },
  avatar_orange: { bg: '#f97316', text: 'O' },
  avatar_pink: { bg: '#ec4899', text: 'K' },
  avatar_yellow: { bg: '#eab308', text: 'Y' },
  avatar_cyan: { bg: '#06b6d4', text: 'C' },
}

// Avatar component
function ProfileAvatar({ avatar, name, size = 'lg', onClick, selected }) {
  const avatarInfo = AVATAR_COLORS[avatar] || AVATAR_COLORS.avatar_blue
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-32 h-32 text-4xl',
  }
  
  return (
    <div
      className={`
        ${sizeClasses[size]} 
        rounded-md flex items-center justify-center font-bold cursor-pointer
        transition-all duration-200 hover:scale-105
        ${selected ? 'ring-4 ring-white' : ''}
      `}
      style={{ backgroundColor: avatarInfo.bg }}
      onClick={onClick}
    >
      {name ? name.charAt(0).toUpperCase() : avatarInfo.text}
    </div>
  )
}

// Avatar selector for edit mode
function AvatarSelector({ currentAvatar, onSelect }) {
  const avatars = Object.keys(AVATAR_COLORS)
  
  return (
    <div className="grid grid-cols-4 gap-3">
      {avatars.map((avatar) => (
        <ProfileAvatar
          key={avatar}
          avatar={avatar}
          size="sm"
          selected={currentAvatar === avatar}
          onClick={() => onSelect(avatar)}
        />
      ))}
    </div>
  )
}

// Profile card component
function ProfileCard({ profile, onSelect, onEdit, isEditing }) {
  // Check if profile has any linked accounts
  const hasLinkedAccounts = profile.linkedAccounts && (
    profile.linkedAccounts.anilistUsername ||
    profile.linkedAccounts.aniworldUsername ||
    profile.linkedAccounts.myanimelistUsername
  )

  return (
    <div
      className="flex flex-col items-center group cursor-pointer"
      onClick={() => !isEditing && onSelect(profile)}
    >
      <div className="relative">
        <ProfileAvatar
          avatar={profile.avatar}
          name={profile.name}
          size="lg"
        />
        {isEditing && (
          <button
            className="absolute -top-2 -right-2 bg-white text-black rounded-full p-1 hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(profile)
            }}
          >
            <Pencil1Icon className="w-4 h-4" />
          </button>
        )}
        {/* Linked accounts indicators */}
        {hasLinkedAccounts && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {profile.linkedAccounts.anilistUsername && (
              <span className="w-2 h-2 rounded-full bg-blue-500" title="AniList linked"></span>
            )}
            {profile.linkedAccounts.aniworldUsername && (
              <span className="w-2 h-2 rounded-full bg-purple-500" title="AniWorld linked"></span>
            )}
            {profile.linkedAccounts.myanimelistUsername && (
              <span className="w-2 h-2 rounded-full bg-green-500" title="MyAnimeList linked"></span>
            )}
          </div>
        )}
      </div>
      <span className="mt-3 text-gray-300 text-lg group-hover:text-white transition-colors">
        {profile.name}
      </span>
    </div>
  )
}

// Add profile card
function AddProfileCard({ onClick, disabled }) {
  return (
    <div
      className={`
        flex flex-col items-center cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && onClick()}
    >
      <div 
        className="w-32 h-32 rounded-md bg-[#333] flex items-center justify-center
          border-2 border-dashed border-gray-500 hover:border-gray-300 transition-colors"
      >
        <PlusIcon className="w-12 h-12 text-gray-400" />
      </div>
      <span className="mt-3 text-gray-400 text-lg">Add Profile</span>
    </div>
  )
}

// Profile editor modal
function ProfileEditor({ profile, onSave, onDelete, onClose, isNew }) {
  const [name, setName] = useState(profile?.name || '')
  const [avatar, setAvatar] = useState(profile?.avatar || 'avatar_blue')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showLinkedAccounts, setShowLinkedAccounts] = useState(false)
  
  // Linked accounts state
  const [anilistUsername, setAnilistUsername] = useState(profile?.linkedAccounts?.anilistUsername || '')
  const [aniworldUsername, setAniworldUsername] = useState(profile?.linkedAccounts?.aniworldUsername || '')
  const [myanimelistUsername, setMyanimelistUsername] = useState(profile?.linkedAccounts?.myanimelistUsername || '')

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a profile name')
      return
    }
    if (name.trim().length > 20) {
      toast.error('Profile name must be 20 characters or less')
      return
    }
    onSave({ 
      name: name.trim(), 
      avatar,
      linkedAccounts: {
        anilistUsername: anilistUsername.trim() || null,
        aniworldUsername: aniworldUsername.trim() || null,
        myanimelistUsername: myanimelistUsername.trim() || null,
      }
    })
  }

  const handleDelete = () => {
    if (isDeleting) {
      onDelete()
    } else {
      setIsDeleting(true)
      setTimeout(() => setIsDeleting(false), 3000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1d] rounded-lg p-6 w-[28rem] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {isNew ? 'Create Profile' : 'Edit Profile'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <Cross2Icon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <ProfileAvatar avatar={avatar} name={name} size="lg" />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Name</label>
            <TextField.Root
              placeholder="Profile name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Avatar</label>
            <AvatarSelector
              currentAvatar={avatar}
              onSelect={setAvatar}
            />
          </div>

          {/* Linked Accounts Section */}
          <div className="border-t border-gray-700 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setShowLinkedAccounts(!showLinkedAccounts)}
              className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span className="font-medium">Link External Accounts</span>
              <span className={`transform transition-transform ${showLinkedAccounts ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showLinkedAccounts && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-500 mb-3">
                  Link your external accounts to sync your watchlist and track progress across platforms.
                </p>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    AniList Username
                  </label>
                  <TextField.Root
                    placeholder="Your AniList username"
                    value={anilistUsername}
                    onChange={(e) => setAnilistUsername(e.target.value)}
                    className="w-full"
                    size="1"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    AniWorld / s.to Username
                  </label>
                  <TextField.Root
                    placeholder="Your AniWorld/s.to username"
                    value={aniworldUsername}
                    onChange={(e) => setAniworldUsername(e.target.value)}
                    className="w-full"
                    size="1"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    MyAnimeList Username
                  </label>
                  <TextField.Root
                    placeholder="Your MyAnimeList username"
                    value={myanimelistUsername}
                    onChange={(e) => setMyanimelistUsername(e.target.value)}
                    className="w-full"
                    size="1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            className="flex-1 cursor-pointer"
            color="green"
            onClick={handleSave}
          >
            <CheckIcon />
            {isNew ? 'Create' : 'Save'}
          </Button>
          
          {!isNew && (
            <Button
              className="cursor-pointer"
              color={isDeleting ? 'red' : 'gray'}
              variant={isDeleting ? 'solid' : 'soft'}
              onClick={handleDelete}
            >
              <TrashIcon />
              {isDeleting ? 'Confirm?' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Main ProfileSelector Component
 * Shows "Who's Watching?" screen with all profiles
 */
export default function ProfileSelector({ onProfileSelect, showManageOption = true, onSkip }) {
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [canCreate, setCanCreate] = useState(true)

  // Load profiles on mount
  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    setIsLoading(true)
    try {
      if (window.api?.profiles) {
        const allProfiles = await window.api.profiles.getAll()
        setProfiles(allProfiles)
        const canCreateMore = await window.api.profiles.canCreate()
        setCanCreate(canCreateMore)
      } else {
        // Fallback for development without Tauri - empty profile list
        setProfiles([])
      }
    } catch (error) {
      console.error('Failed to load profiles:', error)
      toast.error('Failed to load profiles')
    }
    setIsLoading(false)
  }

  const handleSelectProfile = async (profile) => {
    try {
      if (window.api?.profiles) {
        await window.api.profiles.setActive(profile.id)
      }
      toast.success(`Welcome, ${profile.name}!`)
      onProfileSelect?.(profile)
    } catch (error) {
      console.error('Failed to set active profile:', error)
      toast.error('Failed to select profile')
    }
  }

  const handleCreateProfile = async (data) => {
    try {
      if (window.api?.profiles) {
        const newProfile = await window.api.profiles.create(
          data.name,
          data.avatar,
          AVATAR_COLORS[data.avatar]?.bg || '#3b82f6'
        )
        
        // If linked accounts are provided, update them separately
        if (data.linkedAccounts && window.api?.profiles?.updateLinkedAccounts) {
          const updatedProfile = await window.api.profiles.updateLinkedAccounts(
            newProfile.id,
            data.linkedAccounts
          )
          setProfiles([...profiles, updatedProfile])
        } else {
          setProfiles([...profiles, newProfile])
        }
        setCanCreate(profiles.length + 1 < 5)
      }
      toast.success(`Profile "${data.name}" created!`)
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create profile:', error)
      toast.error(error.message || 'Failed to create profile')
    }
  }

  const handleUpdateProfile = async (data) => {
    try {
      if (window.api?.profiles && editingProfile) {
        let updated = await window.api.profiles.update(
          editingProfile.id,
          data.name,
          data.avatar,
          AVATAR_COLORS[data.avatar]?.bg || '#3b82f6'
        )
        
        // If linked accounts are provided, update them
        if (data.linkedAccounts && window.api?.profiles?.updateLinkedAccounts) {
          updated = await window.api.profiles.updateLinkedAccounts(
            editingProfile.id,
            data.linkedAccounts
          )
        }
        
        setProfiles(profiles.map(p => p.id === editingProfile.id ? updated : p))
      }
      toast.success('Profile updated!')
      setEditingProfile(null)
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error(error.message || 'Failed to update profile')
    }
  }

  const handleDeleteProfile = async () => {
    try {
      if (window.api?.profiles && editingProfile) {
        await window.api.profiles.delete(editingProfile.id)
        setProfiles(profiles.filter(p => p.id !== editingProfile.id))
        setCanCreate(true)
      }
      toast.success('Profile deleted!')
      setEditingProfile(null)
    } catch (error) {
      console.error('Failed to delete profile:', error)
      toast.error(error.message || 'Failed to delete profile')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white text-xl">Loading profiles...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center font-space-mono">
      <h1 className="text-4xl font-semibold text-white mb-12">
        {profiles.length === 0 ? 'Create a Profile' : "Who's Watching?"}
      </h1>

      <div className="flex flex-wrap justify-center gap-8 mb-12">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onSelect={handleSelectProfile}
            onEdit={setEditingProfile}
            isEditing={isEditing}
          />
        ))}
        
        {(isEditing || profiles.length === 0) && (
          <AddProfileCard
            onClick={() => setIsCreating(true)}
            disabled={!canCreate}
          />
        )}
      </div>

      {showManageOption && profiles.length > 0 && (
        <Button
          variant="outline"
          color="gray"
          className="cursor-pointer text-gray-400 hover:text-white"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Done' : 'Manage Profiles'}
        </Button>
      )}

      {/* Skip button when no profiles exist */}
      {profiles.length === 0 && onSkip && (
        <Button
          variant="outline"
          color="gray"
          className="cursor-pointer text-gray-400 hover:text-white mt-4"
          onClick={onSkip}
        >
          Skip for now
        </Button>
      )}

      {/* Profile Editor Modal */}
      {(editingProfile || isCreating) && (
        <ProfileEditor
          profile={editingProfile}
          isNew={isCreating}
          onSave={isCreating ? handleCreateProfile : handleUpdateProfile}
          onDelete={handleDeleteProfile}
          onClose={() => {
            setEditingProfile(null)
            setIsCreating(false)
          }}
        />
      )}
    </div>
  )
}

// Export subcomponents for use elsewhere
export { ProfileAvatar, AVATAR_COLORS }
