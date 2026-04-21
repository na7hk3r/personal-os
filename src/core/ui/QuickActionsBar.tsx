import { useNavigate } from 'react-router-dom'
import { Scale, CheckSquare, FileText, Utensils } from 'lucide-react'
import { useCoreStore } from '@core/state/coreStore'

interface QuickAction {
  label: string
  icon: React.ReactNode
  path: string
  color: string
  requiredPlugin?: string
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Registrar peso',
    icon: <Scale size={16} />,
    path: '/fitness/tracking',
    color: 'hover:border-accent/60 hover:text-accent-light',
    requiredPlugin: 'fitness',
  },
  {
    label: 'Nueva tarea',
    icon: <CheckSquare size={16} />,
    path: '/work',
    color: 'hover:border-success/60 hover:text-success',
    requiredPlugin: 'work',
  },
  {
    label: 'Nota rápida',
    icon: <FileText size={16} />,
    path: '/notes',
    color: 'hover:border-warning/60 hover:text-warning',
  },
  {
    label: 'Registrar comida',
    icon: <Utensils size={16} />,
    path: '/fitness/tracking',
    color: 'hover:border-success/60 hover:text-success-light',
    requiredPlugin: 'fitness',
  },
]

export function QuickActionsBar() {
  const navigate = useNavigate()
  const activePlugins = useCoreStore((s) => s.activePlugins)

  const visibleActions = ACTIONS.filter(
    (action) => !action.requiredPlugin || activePlugins.includes(action.requiredPlugin),
  )

  if (visibleActions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visibleActions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.path)}
          className={`flex items-center gap-2 rounded-xl border border-border bg-surface-light/60 px-4 py-2 text-sm text-muted transition-all duration-150 ${action.color} hover:bg-surface-lighter hover:shadow-md`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  )
}
