import { NoteEditor } from '../../../plugins/work/components/NoteEditor'

export function CoreNotesPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Core</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Notas</h1>
      </div>
      <NoteEditor />
    </div>
  )
}
