import { useMemo, useState } from 'react'
import {
  Check,
  Code2,
  ExternalLink,
  FileText,
  Globe,
  Link as LinkIcon,
  PlaySquare,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useWorkStore } from '../store'
import type { Link as LinkRecord } from '../types'

/**
 * Devuelve un icono adecuado según el host del link.
 * Evita cargar recursos externos (favicons remotos) para mantener la app offline-first.
 */
function iconForUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('github.com') || host.includes('gitlab.com') || host.includes('bitbucket.')) return Code2
    if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('vimeo.com')) return PlaySquare
    if (host.includes('notion.so') || host.includes('docs.google.com') || host.includes('confluence.')) return FileText
  } catch {
    // URL inválida — fallback abajo
  }
  return Globe
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function LinkManager() {
  const { links, setLinks } = useWorkStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; url: string; category: string }>({
    title: '',
    url: '',
    category: '',
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return links
    return links.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q),
    )
  }, [links, search])

  const categories = useMemo(
    () => [...new Set(filteredLinks.map((l) => l.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filteredLinks],
  )

  const uncategorized = filteredLinks.filter((l) => !l.category)

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) return
    const id = crypto.randomUUID()
    const link: LinkRecord = {
      id,
      title: title.trim(),
      url: url.trim(),
      category: category.trim(),
    }
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
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      window.setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 3000)
      return
    }

    setLinks(links.filter((l) => l.id !== id))
    setConfirmDeleteId(null)
    await window.storage.execute('DELETE FROM work_links WHERE id = ?', [id])
  }

  const startEdit = (link: LinkRecord) => {
    setEditingId(link.id)
    setEditDraft({ title: link.title, url: link.url, category: link.category })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft({ title: '', url: '', category: '' })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const trimmed = {
      title: editDraft.title.trim(),
      url: editDraft.url.trim(),
      category: editDraft.category.trim(),
    }
    if (!trimmed.title || !trimmed.url) return

    setLinks(links.map((l) => (l.id === editingId ? { ...l, ...trimmed } : l)))
    await window.storage.execute(
      'UPDATE work_links SET title = ?, url = ?, category = ? WHERE id = ?',
      [trimmed.title, trimmed.url, trimmed.category, editingId],
    )
    cancelEdit()
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-surface-light rounded-xl border border-border p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <LinkIcon size={14} className="text-accent-light" />
          Agregar enlace
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="bg-surface border border-border rounded px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="bg-surface border border-border rounded px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría (opcional)"
              className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !url.trim()}
              className="inline-flex items-center gap-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent/85 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      {links.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, URL o categoría..."
            className="w-full bg-surface-light border border-border rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-muted/50 focus:border-accent/60 focus:outline-none"
          />
        </div>
      )}

      {/* Empty state */}
      {links.length === 0 && (
        <p className="text-muted text-sm text-center py-8">No hay enlaces guardados</p>
      )}

      {links.length > 0 && filteredLinks.length === 0 && (
        <p className="text-muted text-sm text-center py-6">Sin resultados para &quot;{search}&quot;</p>
      )}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <LinkGroup
          title="Sin categoría"
          links={uncategorized}
          editingId={editingId}
          editDraft={editDraft}
          confirmDeleteId={confirmDeleteId}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onEditDraftChange={setEditDraft}
          onDelete={handleDelete}
        />
      )}

      {/* Categorized */}
      {categories.map((cat) => (
        <LinkGroup
          key={cat}
          title={cat}
          links={filteredLinks.filter((l) => l.category === cat)}
          editingId={editingId}
          editDraft={editDraft}
          confirmDeleteId={confirmDeleteId}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onEditDraftChange={setEditDraft}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}

interface LinkGroupProps {
  title: string
  links: LinkRecord[]
  editingId: string | null
  editDraft: { title: string; url: string; category: string }
  confirmDeleteId: string | null
  onStartEdit: (link: LinkRecord) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditDraftChange: (draft: { title: string; url: string; category: string }) => void
  onDelete: (id: string) => void
}

function LinkGroup({
  title,
  links,
  editingId,
  editDraft,
  confirmDeleteId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditDraftChange,
  onDelete,
}: LinkGroupProps) {
  return (
    <div className="bg-surface-light rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-micro font-normal text-muted">{links.length}</span>
      </h4>
      <div className="space-y-2">
        {links.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            isEditing={editingId === link.id}
            editDraft={editDraft}
            confirmingDelete={confirmDeleteId === link.id}
            onStartEdit={() => onStartEdit(link)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onEditDraftChange={onEditDraftChange}
            onDelete={() => onDelete(link.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface LinkRowProps {
  link: LinkRecord
  isEditing: boolean
  editDraft: { title: string; url: string; category: string }
  confirmingDelete: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditDraftChange: (draft: { title: string; url: string; category: string }) => void
  onDelete: () => void
}

function LinkRow({
  link,
  isEditing,
  editDraft,
  confirmingDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditDraftChange,
  onDelete,
}: LinkRowProps) {
  const Icon = iconForUrl(link.url)

  if (isEditing) {
    return (
      <div className="rounded-lg border border-accent/40 bg-surface p-2 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={editDraft.title}
            onChange={(e) => onEditDraftChange({ ...editDraft, title: e.target.value })}
            placeholder="Título"
            className="bg-surface-light border border-border rounded px-2 py-1 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            value={editDraft.url}
            onChange={(e) => onEditDraftChange({ ...editDraft, url: e.target.value })}
            placeholder="https://..."
            className="bg-surface-light border border-border rounded px-2 py-1 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            value={editDraft.category}
            onChange={(e) => onEditDraftChange({ ...editDraft, category: e.target.value })}
            placeholder="Categoría"
            className="bg-surface-light border border-border rounded px-2 py-1 text-sm focus:border-accent/60 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted hover:text-white"
          >
            <X size={12} />
            Cancelar
          </button>
          <button
            onClick={onSaveEdit}
            disabled={!editDraft.title.trim() || !editDraft.url.trim()}
            className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent/85 disabled:opacity-50"
          >
            <Check size={12} />
            Guardar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 group rounded-lg px-2 py-1.5 hover:bg-surface/60">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-accent-light hover:underline truncate flex-1 min-w-0"
      >
        <Icon size={14} className="shrink-0 text-muted" />
        <span className="truncate">{link.title}</span>
        <span className="hidden md:inline text-micro text-muted/60 truncate">
          {hostOf(link.url)}
        </span>
        <ExternalLink size={11} className="shrink-0 text-muted/50" />
      </a>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onStartEdit}
          title="Editar"
          className="rounded p-1 text-muted hover:text-accent-light"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          title={confirmingDelete ? 'Confirmar eliminación' : 'Eliminar'}
          className={`rounded px-1 text-micro font-medium ${
            confirmingDelete ? 'text-red-300 bg-red-500/15' : 'text-muted hover:text-red-400'
          }`}
        >
          {confirmingDelete ? '¿?' : '✕'}
        </button>
      </div>
    </div>
  )
}
