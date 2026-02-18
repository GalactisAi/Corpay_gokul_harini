import React, { useState, useMemo } from 'react'

/** Local placeholder when external image fails (e.g. SSL / CORS). */
const PLACEHOLDER_SRC = '/placeholder.svg'

/**
 * In dev, rewrite Unsplash URLs to go through Vite proxy to avoid ERR_CERT_AUTHORITY_INVALID
 * when running on HTTPS localhost or behind strict SSL.
 */
function getImageSrc(url: string | undefined): string | undefined {
  if (!url) return url
  if (import.meta.env.DEV && url.startsWith('https://images.unsplash.com')) {
    try {
      const u = new URL(url)
      return '/unsplash' + u.pathname + u.search
    } catch {
      return url
    }
  }
  return url
}

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const { src, alt, style, className, ...rest } = props

  const effectiveSrc = useMemo(() => getImageSrc(src), [src])

  const handleError = () => {
    setDidError(true)
  }

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={PLACEHOLDER_SRC} alt={alt ?? 'Image unavailable'} {...rest} data-original-url={src} />
        </div>
      </div>
    )
  }

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}
