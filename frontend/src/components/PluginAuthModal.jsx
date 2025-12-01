import { useState } from 'react'
import { Button, Dialog, Spinner, TextField, Checkbox, Text } from '@radix-ui/themes'
import { ExclamationTriangleIcon, LockClosedIcon } from '@radix-ui/react-icons'
import { toast } from 'sonner'
import { zpePluginManager } from '../zpe'

/**
 * PluginAuthModal - A modal component for plugin authentication
 * 
 * Allows users to login to external services (like aniworld.to)
 * through their respective plugins.
 * 
 * @param {Object} props
 * @param {string} props.pluginId - The plugin ID to authenticate with
 * @param {Object} props.pluginInfo - Plugin information object
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onOpenChange - Callback when open state changes
 * @param {Function} [props.onAuthSuccess] - Callback when authentication succeeds
 */
export default function PluginAuthModal({
  pluginId,
  pluginInfo,
  open,
  onOpenChange,
  onAuthSuccess
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get plugin-specific authentication configuration from plugin manifest or fallback to defaults
  // Plugin-specific configs are needed for proper localization (e.g., German for aniworld.to)
  // Plugins can provide their own auth config via their manifest's authConfig property
  const getAuthConfig = () => {
    // Check if plugin provides its own auth configuration
    const pluginAuthConfig = pluginInfo?.authConfig
    if (pluginAuthConfig) {
      return {
        loginUrl: pluginAuthConfig.loginUrl || '',
        serviceName: pluginAuthConfig.serviceName || pluginInfo?.name || pluginId,
        emailPlaceholder: pluginAuthConfig.emailPlaceholder || 'Email',
        passwordPlaceholder: pluginAuthConfig.passwordPlaceholder || 'Password',
        rememberMeLabel: pluginAuthConfig.rememberMeLabel || 'Remember me',
        loginButtonText: pluginAuthConfig.loginButtonText || 'Login',
        registerUrl: pluginAuthConfig.registerUrl,
        forgotPasswordUrl: pluginAuthConfig.forgotPasswordUrl
      }
    }

    // Default configuration for known plugins (for backwards compatibility)
    const knownPluginConfigs = {
      'aniworld': {
        loginUrl: 'https://aniworld.to/login',
        serviceName: 'AniWorld',
        emailPlaceholder: 'E-Mail Adresse',
        passwordPlaceholder: 'Passwort',
        rememberMeLabel: 'Angemeldet bleiben?',
        loginButtonText: 'Einloggen',
        registerUrl: 'https://aniworld.to/registrierung',
        forgotPasswordUrl: 'https://aniworld.to/login/passwort-vergessen'
      }
    }

    // Return plugin-specific config or default
    return knownPluginConfigs[pluginId] || {
      loginUrl: '',
      serviceName: pluginInfo?.name || pluginId,
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password',
      rememberMeLabel: 'Remember me',
      loginButtonText: 'Login'
    }
  }

  const authConfig = getAuthConfig()

  /**
   * Validate URL to ensure it's a valid HTTP/HTTPS URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  const isValidUrl = (url) => {
    if (!url) return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Safely open an external URL
   * @param {string} url - URL to open
   */
  const safeOpenUrl = (url) => {
    if (isValidUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const plugin = await zpePluginManager.getPlugin(pluginId)
      
      if (!plugin) {
        throw new Error(`Plugin '${pluginId}' not found`)
      }

      // Check if plugin has login method
      if (plugin.instance?.login) {
        const result = await plugin.instance.login({
          email,
          password,
          rememberMe
        })

        if (result?.success) {
          toast.success('Login successful', {
            description: `Successfully logged in to ${authConfig.serviceName}`,
            classNames: {
              title: 'text-green-500'
            }
          })
          
          // Store only authentication state in plugin storage (not email for privacy)
          if (plugin.context?.storage) {
            plugin.context.storage.set('isAuthenticated', true)
          }
          
          if (onAuthSuccess) {
            onAuthSuccess(result)
          }
          
          // Reset form and close modal
          setEmail('')
          setPassword('')
          onOpenChange(false)
        } else {
          throw new Error(result?.error || 'Login failed')
        }
      } else {
        // Fallback: Show message that authentication needs to be done externally
        toast.info('External Login Required', {
          description: `Please login directly at ${authConfig.loginUrl}`,
          duration: 5000
        })
        
        // Open external login page with URL validation
        safeOpenUrl(authConfig.loginUrl)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please try again.')
      toast.error('Login failed', {
        icon: <ExclamationTriangleIcon height="16" width="16" color="#ffffff" />,
        description: err.message,
        classNames: {
          title: 'text-rose-500'
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{ maxWidth: 400 }}
        className="font-space-mono"
      >
        <Dialog.Title className="flex items-center gap-2">
          <LockClosedIcon className="h-5 w-5" />
          Login to {authConfig.serviceName}
        </Dialog.Title>
        
        <Dialog.Description size="2" className="mb-4 opacity-70">
          Sign in to access your watchlist and sync progress
        </Dialog.Description>

        {error && (
          <div className="mb-4 rounded bg-red-900/30 p-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Email
            </Text>
            <TextField.Root
              placeholder={authConfig.emailPlaceholder}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </label>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Password
            </Text>
            <TextField.Root
              placeholder={authConfig.passwordPlaceholder}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin()
                }
              }}
            />
          </label>

          <label className="flex items-center gap-2">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              disabled={isLoading}
            />
            <Text size="2">{authConfig.rememberMeLabel}</Text>
          </label>
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <div className="flex gap-3 text-xs opacity-50">
            {authConfig.registerUrl && (
              <a
                href={authConfig.registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 hover:underline"
              >
                Register
              </a>
            )}
            {authConfig.forgotPasswordUrl && (
              <>
                {authConfig.registerUrl && <span>|</span>}
                <a
                  href={authConfig.forgotPasswordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 hover:underline"
                >
                  Forgot Password?
                </a>
              </>
            )}
          </div>
          
          <div className="flex gap-3">
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={isLoading}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleLogin} disabled={isLoading}>
              {isLoading ? <Spinner size="1" /> : authConfig.loginButtonText}
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}
