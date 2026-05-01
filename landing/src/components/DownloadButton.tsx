import { useEffect, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { Button } from './Button'
import { detectOS, osLabel, type DetectedOS } from '../hooks/useDetectOS'
import {
  FALLBACK_RELEASES_URL,
  useLatestRelease,
  type LatestRelease,
} from '../hooks/useLatestRelease'

interface DownloadButtonProps {
  size?: 'md' | 'lg'
  /** Forzar OS (útil para tests). */
  forceOS?: DetectedOS
}

function pickAsset(os: DetectedOS, release: LatestRelease | null): string | null {
  if (!release) return null
  const a = release.assets
  switch (os) {
    case 'windows':
      return a.windows?.url ?? a.windowsPortable?.url ?? null
    case 'mac':
      return a.macDmg?.url ?? null
    case 'linux':
      return a.linuxAppImage?.url ?? a.linuxDeb?.url ?? null
    default:
      return null
  }
}

export function DownloadButton({ size = 'lg', forceOS }: DownloadButtonProps) {
  const { release, loading } = useLatestRelease()
  const [os, setOS] = useState<DetectedOS>(forceOS ?? 'unknown')

  useEffect(() => {
    if (forceOS) {
      setOS(forceOS)
      return
    }
    setOS(detectOS())
  }, [forceOS])

  const assetUrl = pickAsset(os, release)
  const label = `Descargar para ${osLabel(os)}`
  const href = assetUrl ?? FALLBACK_RELEASES_URL
  const isFallback = !assetUrl

  return (
    <Button
      as="a"
      href={href}
      variant="primary"
      size={size}
      leftIcon={<Download className="w-5 h-5" aria-hidden="true" />}
      rightIcon={isFallback ? <ExternalLink className="w-4 h-4" aria-hidden="true" /> : undefined}
      aria-label={loading ? 'Cargando última versión' : label}
      target={isFallback ? '_blank' : undefined}
      rel={isFallback ? 'noopener noreferrer' : undefined}
    >
      {loading && !release ? 'Cargando…' : label}
    </Button>
  )
}
