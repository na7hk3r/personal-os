import { useEffect, useState } from 'react'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { tagsService, type Tag as TagModel, type TagUsage } from '@core/services/tagsService'
import { GlobalTagChip } from '@core/ui/components/GlobalTagPicker'

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280']

export function TagsSection() {
  const [tags, setTags] = useState<TagModel[]>([])
  const [usage, setUsage] = useState<Record<number, TagUsage>>({})
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(PRESET_COLORS[0])
  const [error, setError] = useState('')

  const refresh = () => {
    void Promise.all([tagsService.list(), tagsService.usageCounts()]).then(([nextTags, counts]) => {
      setTags(nextTags)
      setUsage(Object.fromEntries(counts.map((item) => [item.id, item])))
    })
  }

  useEffect(() => { refresh() }, [])

  const create = async () => {
    setError('')
    try {
      await tagsService.ensure(name.trim(), color)
      setName('')
      refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const removeTag = async (tag: TagModel) => {
    if (!window.confirm(`Eliminar tag "${tag.name}"?`)) return
    await tagsService.remove(tag.id)
    refresh()
  }

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center gap-2">
        <Tag size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold">Tags globales</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Etiquetas compartidas para organizar notas, tarjetas de Work y tareas del Planner. Al tocar un tag ves todas sus conexiones.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex-1 space-y-1">
          <span className="text-xs text-muted">Nuevo tag</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej: cliente-acme"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-center gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? 'scale-110 border-white' : 'border-border'}`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => void create()}
          disabled={!name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-50"
        >
          <Plus size={12} aria-hidden />
          Crear
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-warning">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-xs text-muted">Sin tags todavia.</p>
        ) : tags.map((tag) => (
          <div key={tag.id} className="inline-flex items-center gap-1">
            <GlobalTagChip
              tag={tag}
              count={usage[tag.id]?.usage_count ?? 0}
            />
            <button
              type="button"
              onClick={() => void removeTag(tag)}
              className="rounded-md p-1 text-muted hover:bg-warning/10 hover:text-warning"
              aria-label={`Eliminar tag ${tag.name}`}
            >
              <Trash2 size={11} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </article>
  )
}
