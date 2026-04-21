import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarClock, CircleAlert, ListTodo } from 'lucide-react'
import { useWorkStore } from '@plugins/work/store'
import { useCoreStore } from '@core/state/coreStore'
import {
  isDoneColumn,
  isInProgressColumn,
  isTodoColumn,
  getColumnIds,
} from '@plugins/work/utils/columnUtils'
import {
  formatDueDate,
  isDueDateOverdue,
  isDueDateToday,
  getStartOfToday,
  getEndOfToday,
} from '@core/utils/dateUtils'
import type { Card, Column } from '@plugins/work/types'

interface TaskGroup {
  priorityTasks: Card[]
  overdueCount: number
  dueTodayCount: number
  totalPending: number
}

function computePriorityTasks(cards: Card[], columns: Column[]): TaskGroup {
  const doneIds = getColumnIds(columns, isDoneColumn)
  const inProgressIds = getColumnIds(columns, isInProgressColumn)
  const todoIds = getColumnIds(columns, isTodoColumn)

  const now = Date.now()
  const startOfToday = getStartOfToday()
  const endOfToday = getEndOfToday()

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
    return isDueDateOverdue(c.dueDate)
  }).length

  const dueTodayCount = activeCards.filter((c) => {
    if (!c.dueDate) return false
    return isDueDateToday(c.dueDate)
  }).length

  return {
    priorityTasks,
    overdueCount,
    dueTodayCount,
    totalPending: activeCards.length,
  }
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
