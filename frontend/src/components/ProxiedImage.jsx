/**
 * ProxiedImage Component
 * 
 * An image component that automatically handles CORS-restricted images
 * by using Tauri's HTTP plugin to fetch them.
 */

import { useProxiedImage } from '../hooks/useProxiedImage'

/**
 * Image component that automatically proxies CORS-restricted images
 * @param {Object} props - Standard img props plus src
 * @param {string} props.src - Image URL (will be proxied if from CORS-restricted domain)
 * @param {string} [props.fallback] - Optional fallback content when image fails
 * @param {React.ReactNode} [props.children] - Optional children to render as fallback
 * @returns {JSX.Element}
 */
export default function ProxiedImage({ src, fallback, children, ...imgProps }) {
  const { src: proxiedSrc, isLoading, error } = useProxiedImage(src)

  // If there's an error and we have fallback content, render it
  if (error && (fallback || children)) {
    return fallback || children
  }

  // Render the image with proxied source
  return (
    <img
      {...imgProps}
      src={proxiedSrc}
      style={{
        ...imgProps.style,
        opacity: isLoading ? 0.5 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }}
    />
  )
}
