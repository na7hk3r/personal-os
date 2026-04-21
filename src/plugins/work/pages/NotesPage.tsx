import { NoteEditor } from '../components/NoteEditor'

export function NotesPage() {
  return (
    <div className="plugin-shell plugin-shell-work space-y-4">
      <div className="plugin-panel p-4">
        <h3 className="text-lg font-semibold mb-1">Notas</h3>
        <p className="text-xs text-muted">Workspace premium para documentación y decisiones.</p>
      </div>
      <NoteEditor />
    </div>
  )
}
