/**
 * Catálogo central de atajos de teclado de Personal OS.
 *
 * Cada entrada documenta un shortcut implementado en el shell o en un plugin.
 * Si añadís un atajo nuevo, agregalo acá para que aparezca en /shortcuts y en
 * el Command Palette. Mantener sincronizado con `docs/SHORTCUTS.md`.
 */

export interface ShortcutEntry {
  /** Identificador estable, para keys de React. */
  id: string
  /** Combinación textual ya formateada (ej. "Ctrl/Cmd + K"). */
  keys: string
  /** Acción humana. */
  action: string
  /** Dónde aplica el atajo (global, módulo concreto, modal, etc.). */
  scope: 'global' | 'palette' | 'modal' | 'editor' | 'kanban' | 'journal'
  /** Descripción opcional con más contexto. */
  description?: string
}

export interface ShortcutGroup {
  id: string
  title: string
  entries: ShortcutEntry[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: 'global',
    title: 'Global',
    entries: [
      {
        id: 'palette-open',
        keys: 'Ctrl/Cmd + K',
        action: 'Abrir Command Palette',
        scope: 'global',
        description: 'Búsqueda global de comandos, páginas y acciones rápidas.',
      },
    ],
  },
  {
    id: 'palette',
    title: 'Command Palette',
    entries: [
      { id: 'palette-down', keys: '↓', action: 'Siguiente resultado', scope: 'palette' },
      { id: 'palette-up', keys: '↑', action: 'Resultado anterior', scope: 'palette' },
      { id: 'palette-enter', keys: 'Enter', action: 'Ejecutar resultado', scope: 'palette' },
      { id: 'palette-esc', keys: 'Esc', action: 'Cerrar palette', scope: 'palette' },
    ],
  },
  {
    id: 'modal',
    title: 'Modales y diálogos',
    entries: [
      {
        id: 'modal-esc',
        keys: 'Esc',
        action: 'Cerrar modal o diálogo activo',
        scope: 'modal',
      },
    ],
  },
  {
    id: 'journal',
    title: 'Journal',
    entries: [
      {
        id: 'journal-save',
        keys: 'Ctrl/Cmd + S',
        action: 'Guardar entrada del día',
        scope: 'journal',
        description: 'Funciona en el editor de Journal mientras estás escribiendo.',
      },
    ],
  },
  {
    id: 'kanban',
    title: 'Kanban (Work)',
    entries: [
      {
        id: 'kanban-add',
        keys: 'Enter',
        action: 'Agregar tarjeta o columna',
        scope: 'kanban',
        description: 'Cuando el input de nueva tarjeta o columna tiene foco.',
      },
      {
        id: 'kanban-cancel',
        keys: 'Esc',
        action: 'Cancelar edición',
        scope: 'kanban',
      },
    ],
  },
]

export function getAllShortcuts(): ShortcutEntry[] {
  return SHORTCUT_GROUPS.flatMap((g) => g.entries)
}
