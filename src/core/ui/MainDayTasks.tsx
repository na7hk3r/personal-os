import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarClock, CircleAlert, ListTodo } from 'lucide-react'
import { useWorkStore } from '@plugins/work/store'
import { useCoreStore } from '@core/state/coreStore'
import type { Card, Column } from '@plugins/work/types'

function isColumnMatch(name: string, pattern: RegExp): boolean {
  return pattern.test(name.toLowerCase())
}

function isDoneColumn(col: Column): boolean {
  return col.id === 'col-done' || isColumnMatch(col.name, /hecho|done/)
}

function isInProgressColumn(col: Column): boolean {
  return col.id === 'col-progress' || isColumnMatch(col.name, /progreso|progress/)
}

function isTodoColumn(col: Column): boolean {
  return col.id === 'col-todo' || isColumnMatch(col.name, /hacer|todo/)
}

interface TaskGroup {
  priorityTasks: Card[]
  overdueCount: number
  dueTodayCount: number
  totalPending: number
}

function computePriorityTasks(cards: Card[], columns: Column[]): TaskGroup {
  const doneIds = new Set(columns.filter(isDoneColumn).map((c) => c.id))
  const inProgressIds = new Set(columns.filter(isInProgressColumn).map((c) => c.id))
  const todoIds = new Set(columns.filter(isTodoColumn).map((c) => c.id))

  const now = Date.now()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const activeCards = cards.filter((c) => !doneIds.has(c.columnId))
  const inProgressCards = activeCards.filter((c) => inProgressIds.has(c.columnId))
  const todoCardsWithDate = activeCards
    .filter((c) => todoIds.has(c.columnId) && c.dueDate)
    .sort((a, b) => {
      const ta = new Date(a.dueDate!).getTime()
      const tb = new Date(b.dueDate!).getTime()
      return ta - tb
    })

  // Top 3: in-progress first, then todo with due date
  const priorityTasks = [...inProgressCards, ...todoCardsWithDate].slice(0, 3)

  const overdueCount = activeCards.filter((c) => {
    if (!c.dueDate) return false
    const t = new Date(c.dueDate).getTime()
    return !isNaN(t) && t < startOfToday.getTime()
  }).length

  const dueTodayCount = activeCards.filter((c) => {
    if (!c.dueDate) return false
    const t = new Date(c.dueDate).getTime()
    return !isNaN(t) && t >= startOfToday.getTime() && t <= endOfToday.getTime()
  }).length

  return {
    priorityTasks,
    overdueCount,
    dueTodayCount,
    totalPending: activeCards.length,
  }
}

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null
  const t = new Date(dueDate).getTime()
  if (isNaN(t)) return null

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diff = Math.floor((t - start) / 86_400_000)

  if (diff < 0) return `Vence hace ${Math.abs(diff)}d`
  if (diff === 0) return 'Vence hoy'
  if (diff === 1) return 'Vence mañana'
  return `Vence en ${diff}d`
}

function isDueDateOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const t = new Date(dueDate).getTime()
  if (isNaN(t)) return false
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return t < startOfToday.getTime()
}

function isDueDateToday(dueDate: string | null): boolean {
  if (!dueDate) return false
  const t = new Date(dueDate).getTime()
  if (isNaN(t)) return false
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return t >= start.getTime() && t <= end.getTime()
}

export function MainDayTasks() {
  const navigate = useNavigate()
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const isWorkActive = activePlugins.includes('work')

  const { cards, columns } = useWorkStore()

  const group = useMemo(
    () => computePriorityTasks(cards, columns),
    [cards, columns],
  )

  if (!isWorkActive) return null
  if (cards.length === 0) return null

  const hasBadges = group.overdueCount > 0 || group.dueTodayCount > 0

  return (
    <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Work</p>
          <h3 className="mt-0.5 text-base font-semibold text-white">Misiones principales del día</h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {group.overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-danger/35 bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
              <CircleAlert size={11} />
              {group.overdueCount} atrasada{group.overdueCount > 1 ? 's' : ''}
            </span>
          )}
          {group.dueTodayCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              <CalendarClock size={11} />
              {group.dueTodayCount} vence{group.dueTodayCount > 1 ? 'n' : ''} hoy
            </span>
          )}
        </div>
      </div>

      <div className={`space-y-2 ${hasBadges ? 'mt-3' : 'mt-4'}`}>
        {group.priorityTasks.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
            <ListTodo size={15} />
            Sin tareas principales hoy. ¡Buen trabajo!
          </div>
        ) : (
          group.priorityTasks.map((task) => {
            const dateLabel = formatDueDate(task.dueDate)
            const overdue = isDueDateOverdue(task.dueDate)
            const dueToday = isDueDateToday(task.dueDate)

            return (
              <button
                key={task.id}
                onClick={() => navigate('/work')}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-left transition-all hover:border-accent/40 hover:bg-surface"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{task.title}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {dateLabel && (
                    <span
                      className={`text-[11px] font-medium ${
                        overdue ? 'text-danger' : dueToday ? 'text-warning' : 'text-muted'
                      }`}
                    >
                      {dateLabel}
                    </span>
                  )}
                  <ArrowRight size={13} className="text-muted/60" />
                </div>
              </button>
            )
          })
        )}
      </div>

      {group.totalPending > 3 && group.priorityTasks.length > 0 && (
        <button
          onClick={() => navigate('/work')}
          className="mt-2 w-full text-center text-[11px] text-muted transition-colors hover:text-accent-light"
        >
          +{group.totalPending - 3} más pendientes → Ver tablero
        </button>
      )}
    </section>
  )
}
