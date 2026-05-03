import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, AlertCircle, AlertTriangle, Info, RefreshCw, Wand2, Check } from 'lucide-react'
import { useAuditStore } from '@core/audit/store'
import type { Finding, RuleId, Severity } from '@core/audit/types'

const SEVERITY_META: Record<Severity, { label: string; color: string; Icon: typeof AlertCircle }> = {
  error: { label: 'Errores', color: 'text-red-400 border-red-500/30 bg-red-500/10', Icon: AlertCircle },
  warn: { label: 'Advertencias', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10', Icon: AlertTriangle },
  info: { label: 'Info', color: 'text-sky-300 border-sky-500/30 bg-sky-500/10', Icon: Info },
}

const RULE_LABELS: Record<RuleId, string> = {
  R1: 'R1 · Logros huérfanos',
  R2: 'R2 · Misiones huérfanas',
  R3: 'R3 · Eventos sin emisor',
  R4: 'R4 · Notificaciones huérfanas',
  R5: 'R5 · UI fantasma',
  R6: 'R6 · Iconografía',
  R7: 'R7 · Listeners cruzados',
  R8: 'R8 · Quick actions',
  R9: 'R9 · Onboarding pendiente',
  R10: 'R10 · Persistencia residual',
}

interface FilterState {
  rule: RuleId | 'all'
  pluginId: string
  severity: Severity | 'all'
}

export function AuditPanel() {
  const report = useAuditStore((s) => s.report)
  const isRunning = useAuditStore((s) => s.isRunning)
  const runAudit = useAuditStore((s) => s.runAudit)
  const applyFix = useAuditStore((s) => s.applyFix)
  const dismissFinding = useAuditStore((s) => s.dismissFinding)

  const [filter, setFilter] = useState<FilterState>({ rule: 'all', pluginId: '', severity: 'all' })
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!report) void runAudit()
  }, [report, runAudit])

  const findings = useMemo(() => report?.findings ?? [], [report])

  const pluginIds = useMemo(() => {
    const set = new Set<string>()
    for (const f of findings) if (f.pluginId) set.add(f.pluginId)
    return [...set].sort()
  }, [findings])

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (filter.rule !== 'all' && f.rule !== filter.rule) return false
      if (filter.severity !== 'all' && f.severity !== filter.severity) return false
      if (filter.pluginId && f.pluginId !== filter.pluginId) return false
      return true
    })
  }, [findings, filter])

  const grouped = useMemo(() => {
    const out: Record<Severity, Finding[]> = { error: [], warn: [], info: [] }
    for (const f of filtered) out[f.severity].push(f)
    return out
  }, [filtered])

  async function handleApplyFix(f: Finding) {
    if (!f.fix) return
    const ok = await applyFix(f.fix)
    if (ok) {
      setAppliedIds((prev) => new Set(prev).add(f.id))
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-surface-light/85 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert size={20} className="text-accent-light" />
          <div>
            <h2 className="text-lg font-semibold">Consistency Auditor</h2>
            <p className="text-xs text-muted">
              Detecta inconsistencias entre el core y los plugins. Última corrida:{' '}
              {report ? new Date(report.generatedAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
        <button
          onClick={() => void runAudit()}
          disabled={isRunning}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-lighter disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
          {isRunning ? 'Auditando…' : 'Re-auditar'}
        </button>
      </header>

      {/* KPI badges */}
      <div className="grid grid-cols-3 gap-3">
        {(['error', 'warn', 'info'] as const).map((sev) => {
          const meta = SEVERITY_META[sev]
          const count = report?.countsBySeverity[sev] ?? 0
          const Icon = meta.Icon
          return (
            <button
              key={sev}
              onClick={() => setFilter((f) => ({ ...f, severity: f.severity === sev ? 'all' : sev }))}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${meta.color} ${filter.severity === sev ? 'ring-2 ring-white/30' : ''}`}
            >
              <div>
                <p className="text-xs uppercase tracking-wide opacity-80">{meta.label}</p>
                <p className="text-2xl font-semibold">{count}</p>
              </div>
              <Icon size={20} />
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <select
          value={filter.rule}
          onChange={(e) => setFilter((f) => ({ ...f, rule: e.target.value as RuleId | 'all' }))}
          className="rounded-md border border-border bg-surface px-2 py-1.5"
        >
          <option value="all">Todas las reglas</option>
          {(Object.keys(RULE_LABELS) as RuleId[]).map((r) => (
            <option key={r} value={r}>{RULE_LABELS[r]}</option>
          ))}
        </select>
        <select
          value={filter.pluginId}
          onChange={(e) => setFilter((f) => ({ ...f, pluginId: e.target.value }))}
          className="rounded-md border border-border bg-surface px-2 py-1.5"
        >
          <option value="">Todos los plugins</option>
          {pluginIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
        {(filter.rule !== 'all' || filter.pluginId || filter.severity !== 'all') && (
          <button
            className="text-muted underline hover:text-white"
            onClick={() => setFilter({ rule: 'all', pluginId: '', severity: 'all' })}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Findings grouped */}
      <div className="space-y-4">
        {(['error', 'warn', 'info'] as const).map((sev) => {
          const list = grouped[sev]
          if (list.length === 0) return null
          const meta = SEVERITY_META[sev]
          const Icon = meta.Icon
          return (
            <div key={sev} className="space-y-2">
              <h3 className={`flex items-center gap-2 text-sm font-semibold ${meta.color.split(' ')[0]}`}>
                <Icon size={14} /> {meta.label} ({list.length})
              </h3>
              <ul className="space-y-2">
                {list.map((f) => (
                  <li
                    key={f.id}
                    className={`rounded-lg border p-3 text-sm ${meta.color}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-wide opacity-70">
                          {RULE_LABELS[f.rule]}
                          {f.pluginId && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-micro">{f.pluginId}</span>}
                          {f.location && <span className="ml-2 opacity-60">{f.location}</span>}
                        </p>
                        <p className="mt-1 text-white">{f.message}</p>
                        {f.details?.suggestions ? (
                          <p className="mt-1 text-xs opacity-80">
                            Sugerencias: <span className="font-mono">{(f.details.suggestions as string[]).join(', ')}</span>
                          </p>
                        ) : null}
                      </div>
                      {f.fix && !appliedIds.has(f.id) && (
                        <button
                          onClick={() => void handleApplyFix(f)}
                          className="flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
                        >
                          <Wand2 size={12} /> Aplicar sugerencia
                        </button>
                      )}
                      {appliedIds.has(f.id) && (
                        <span className="flex items-center gap-1 text-xs text-emerald-300">
                          <Check size={12} /> Aplicado
                        </span>
                      )}
                      <button
                        onClick={() => dismissFinding(f.id)}
                        className="text-xs text-muted underline hover:text-white"
                        title="Ocultar de esta corrida"
                      >
                        Ocultar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
            ✓ Sin hallazgos para los filtros actuales.
          </p>
        )}
      </div>
    </section>
  )
}
