import { NoteEditor } from '../components/NoteEditor'

export function NotesPage() {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Notas</h3>
      <NoteEditor />
    </div>
  )
}
