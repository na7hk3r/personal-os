import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, Save } from 'lucide-react'
import { ollamaService, type OllamaSettings } from '@core/services/ollamaService'

export function OllamaSection() {
  const [settings, setSettings] = useState<OllamaSettings | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    void ollamaService.getSettings().then(setSettings)
  }, [])

  const refreshModels = async () => {
    setBusy(true); setStatus('Buscando modelos...')
    try {
      const list = await ollamaService.listModels()
      setModels(list.map((m) => m.name))
      setStatus(`${list.length} modelos disponibles`)
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true); setStatus('Probando conexión...')
    try {
      const h = await ollamaService.health()
      setStatus(h.ok ? `Conectado a ${h.baseUrl}` : `No responde · ${h.error ?? ''}`)
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!settings) return
    setBusy(true)
    try {
      await ollamaService.saveSettings(settings)
      setStatus('Configuración guardada')
    } finally {
      setBusy(false)
    }
  }

  if (!settings) return null

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold">Ollama (IA local)</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Conectá Nora OS a tu instancia local de Ollama (http://127.0.0.1:11434) para análisis con IA basados en tus datos. Todo se procesa offline.
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium">Habilitar Ollama</p>
            <p className="text-xs text-muted">Si está apagado no se hace ninguna llamada de red</p>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="h-4 w-4"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted">Modelo</span>
            <div className="flex gap-2">
              <input
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                list="ollama-models"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="llama3.2:3b"
              />
              <datalist id="ollama-models">
                {models.map((m) => <option key={m} value={m} />)}
              </datalist>
              <button
                type="button"
                onClick={() => void refreshModels()}
                disabled={busy}
                className="shrink-0 rounded-lg border border-border bg-surface px-3 text-xs text-muted hover:text-white"
                title="Cargar modelos disponibles"
              ><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /></button>
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Temperatura ({settings.temperature})</span>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.1}
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: Number(e.target.value) })}
              className="w-full"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted">Prompt de sistema (define personalidad del coach)</span>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
        ><Save size={13} /> Guardar</button>
        <button
          onClick={() => void test()}
          disabled={busy}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >Probar conexión</button>
        {status && <span className="text-xs text-muted">{status}</span>}
      </div>
    </article>
  )
}
