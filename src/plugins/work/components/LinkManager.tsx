import { useState } from 'react'
import { useWorkStore } from '../store'

export function LinkManager() {
  const { links, setLinks } = useWorkStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) return
    const id = crypto.randomUUID()
    const link = { id, title: title.trim(), url: url.trim(), category: category.trim() }
    setLinks([...links, link])
    setTitle('')
    setUrl('')
    setCategory('')

    await window.storage.execute(
      'INSERT INTO work_links (id, title, url, category) VALUES (?, ?, ?, ?)',
      [id, link.title, link.url, link.category],
    )
  }

  const handleDelete = async (id: string) => {
    setLinks(links.filter((l) => l.id !== id))
    await window.storage.execute('DELETE FROM work_links WHERE id = ?', [id])
  }

  const categories = [...new Set(links.map((l) => l.category).filter(Boolean))]

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-surface-light rounded-xl border border-border p-4">
        <h4 className="text-sm font-semibold mb-3">Agregar enlace</h4>
        <div className="grid grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="bg-surface border border-border rounded px-3 py-2 text-sm"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="bg-surface border border-border rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría"
              className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent-light"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Links by category */}
      {categories.length === 0 && links.length > 0 && (
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <h4 className="text-sm font-semibold mb-3">Sin categoría</h4>
          <div className="space-y-2">
            {links
              .filter((l) => !l.category)
              .map((link) => (
                <LinkRow key={link.id} link={link} onDelete={handleDelete} />
              ))}
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat} className="bg-surface-light rounded-xl border border-border p-4">
          <h4 className="text-sm font-semibold mb-3">{cat}</h4>
          <div className="space-y-2">
            {links
              .filter((l) => l.category === cat)
              .map((link) => (
                <LinkRow key={link.id} link={link} onDelete={handleDelete} />
              ))}
          </div>
        </div>
      ))}

      {links.length === 0 && (
        <p className="text-muted text-sm text-center py-8">No hay enlaces guardados</p>
      )}
    </div>
  )
}

function LinkRow({ link, onDelete }: { link: { id: string; title: string; url: string }; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between group">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-accent-light hover:underline truncate flex-1"
      >
        {link.title}
      </a>
      <button
        onClick={() => onDelete(link.id)}
        className="text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 ml-2"
      >
        ✕
      </button>
    </div>
  )
}
