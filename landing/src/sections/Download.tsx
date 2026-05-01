import { Section } from '../components/Section'
import { DownloadButton } from '../components/DownloadButton'
import {
  FALLBACK_RELEASES_URL,
  useLatestRelease,
  type ReleaseAsset,
} from '../hooks/useLatestRelease'
import { Download, Apple, Monitor, HardDrive } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Row {
  os: string
  type: string
  asset?: ReleaseAsset
  icon: LucideIcon
}

function fmtSize(bytes?: number): string {
  if (!bytes) return '—'
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(1)} MB`
}

export function Download_() {
  const { release, loading, error } = useLatestRelease()

  const rows: Row[] = release
    ? [
        { os: 'Windows', type: 'Instalador (NSIS)', asset: release.assets.windows, icon: Monitor },
        { os: 'Windows', type: 'Portable', asset: release.assets.windowsPortable, icon: Monitor },
        { os: 'Linux', type: 'AppImage', asset: release.assets.linuxAppImage, icon: HardDrive },
        { os: 'Linux', type: 'Debian (.deb)', asset: release.assets.linuxDeb, icon: HardDrive },
        { os: 'macOS', type: 'DMG', asset: release.assets.macDmg, icon: Apple },
      ]
    : []

  return (
    <Section
      id="download"
      eyebrow="Descargar"
      title="Instalá la última versión"
      description={
        release
          ? `Versión ${release.version}${
              release.publishedAt
                ? ` · publicada el ${new Date(release.publishedAt).toLocaleDateString('es-ES')}`
                : ''
            }`
          : 'Descargá Personal OS para tu sistema operativo.'
      }
    >
      <div className="flex justify-center mb-10">
        <DownloadButton size="lg" />
      </div>

      {loading && !release && (
        <p className="text-center text-muted">Cargando información del último release…</p>
      )}

      {error && !release && (
        <div className="text-center">
          <p className="text-muted mb-3">
            No pudimos consultar GitHub ahora mismo. Podés ver todos los binarios manualmente:
          </p>
          <a
            href={FALLBACK_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-1"
          >
            Abrir página de releases →
          </a>
        </div>
      )}

      {release && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-light text-left text-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">SO</th>
                <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
                <th scope="col" className="px-4 py-3 font-semibold">Tamaño</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Descarga</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ os, type, asset, icon: Icon }) => (
                <tr
                  key={`${os}-${type}`}
                  className="border-t border-border hover:bg-surface-light/50 transition-colors"
                >
                  <td className="px-4 py-3 text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted" aria-hidden="true" />
                      {os}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{type}</td>
                  <td className="px-4 py-3 text-muted">{fmtSize(asset?.size)}</td>
                  <td className="px-4 py-3 text-right">
                    {asset ? (
                      <a
                        href={asset.url}
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                        aria-label={`Descargar ${asset.name}`}
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        Descargar
                      </a>
                    ) : (
                      <span className="text-muted">No disponible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        ¿Buscás versiones anteriores?{' '}
        <a
          href={FALLBACK_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Ver historial de releases
        </a>
      </p>
    </Section>
  )
}
