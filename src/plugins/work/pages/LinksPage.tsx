import { LinkManager } from '../components/LinkManager'

export function LinksPage() {
  return (
    <div className="plugin-shell plugin-shell-work space-y-4">
      <div className="plugin-panel p-4">
        <h3 className="text-lg font-semibold mb-1">Enlaces</h3>
        <p className="text-xs text-muted">Colección curada con visual integrada al ecosistema Work.</p>
      </div>
      <LinkManager />
    </div>
  )
}
