import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useFitnessStore } from './store'
import { FITNESS_EVENTS } from './events'
import { KpiCards } from './components/KpiCards'
import { FitnessDashboard } from './pages/FitnessDashboard'
import { TrackingPage } from './pages/TrackingPage'
import { MeasurementsPage } from './pages/MeasurementsPage'
import type { DailyEntry, Measurement } from './types'

const fitnessPlugin: PluginManifest = {
  id: 'fitness',
  name: 'Fitness',
  version: '1.0.0',
  description: 'Control de peso, comidas, entrenos y hábitos de salud',
  icon: 'Dumbbell',

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS fitness_daily_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          day_name TEXT,
          weight REAL,
          breakfast INTEGER DEFAULT 0,
          lunch INTEGER DEFAULT 0,
          snack INTEGER DEFAULT 0,
          dinner INTEGER DEFAULT 0,
          workout TEXT,
          cigarettes INTEGER DEFAULT 0,
          sleep REAL,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS fitness_measurements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          weight REAL,
          arm_relaxed REAL,
          arm_flexed REAL,
          chest REAL,
          waist REAL,
          leg REAL,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `,
    },
  ],

  widgets: [
    {
      id: 'fitness-kpi',
      pluginId: 'fitness',
      title: 'KPIs Fitness',
      component: KpiCards,
      defaultSize: { w: 3, h: 1 },
    },
  ],

  pages: [
    {
      id: 'fitness-dashboard',
      pluginId: 'fitness',
      path: '/fitness',
      title: 'Fitness',
      icon: 'Dumbbell',
      component: FitnessDashboard,
    },
    {
      id: 'fitness-tracking',
      pluginId: 'fitness',
      path: '/fitness/tracking',
      title: 'Registro',
      icon: 'SquarePen',
      component: TrackingPage,
    },
    {
      id: 'fitness-measurements',
      pluginId: 'fitness',
      path: '/fitness/measurements',
      title: 'Medidas',
      icon: 'Ruler',
      component: MeasurementsPage,
    },
  ],

  navItems: [
    { id: 'fitness-nav', pluginId: 'fitness', label: 'Fitness', icon: 'Dumbbell', path: '/fitness', order: 10 },
    { id: 'fitness-tracking-nav', pluginId: 'fitness', label: 'Registrar', icon: 'SquarePen', path: '/fitness/tracking', order: 11, parentId: 'fitness-nav' },
    { id: 'fitness-measures-nav', pluginId: 'fitness', label: 'Medidas', icon: 'Ruler', path: '/fitness/measurements', order: 12, parentId: 'fitness-nav' },
  ],

  events: {
    emits: Object.values(FITNESS_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    // Load data from SQLite into Zustand store
    const entries = await api.storage.query(
      'SELECT * FROM fitness_daily_entries ORDER BY date ASC',
    ) as DailyEntry[]

    const measurements = await api.storage.query(
      'SELECT * FROM fitness_measurements ORDER BY date ASC',
    ) as Measurement[]

    // Map snake_case → camelCase
    const mappedEntries: DailyEntry[] = (entries as any[]).map((row) => ({
      id: row.id,
      date: row.date,
      dayName: row.day_name,
      weight: row.weight,
      breakfast: row.breakfast,
      lunch: row.lunch,
      snack: row.snack,
      dinner: row.dinner,
      workout: row.workout,
      cigarettes: row.cigarettes,
      sleep: row.sleep,
      notes: row.notes,
    }))

    const mappedMeasurements: Measurement[] = (measurements as any[]).map((row) => ({
      id: row.id,
      date: row.date,
      weight: row.weight,
      armRelaxed: row.arm_relaxed,
      armFlexed: row.arm_flexed,
      chest: row.chest,
      waist: row.waist,
      leg: row.leg,
    }))

    useFitnessStore.getState().setEntries(mappedEntries)
    useFitnessStore.getState().setMeasurements(mappedMeasurements)

    // Listen to own events for gamification
    api.events.on(FITNESS_EVENTS.DAILY_ENTRY_SAVED, () => {
      api.gamification.addPoints(5, 'Registro diario completado')
    })

    api.events.on(FITNESS_EVENTS.WORKOUT_COMPLETED, () => {
      api.gamification.addPoints(25, 'Entrenamiento completado')
    })

    api.events.on(FITNESS_EVENTS.MEASUREMENT_SAVED, () => {
      api.gamification.addPoints(5, 'Medicion corporal registrada')
    })
  },
}

registerPlugin(fitnessPlugin)

export default fitnessPlugin
