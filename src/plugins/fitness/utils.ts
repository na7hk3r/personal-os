import { useFitnessStore } from './store'
import type { DailyEntry, Measurement } from './types'

export function getCurrentWeight(entries: DailyEntry[]): number | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].weight != null) return entries[i].weight
  }
  return null
}

export function getPreviousWeight(entries: DailyEntry[]): number | null {
  let found = false
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].weight != null) {
      if (found) return entries[i].weight
      found = true
    }
  }
  return null
}

export function getMealCompliancePercent(entries: DailyEntry[], days = 30): number {
  const recent = entries.slice(-days)
  if (recent.length === 0) return 0
  const total = recent.reduce(
    (sum, e) => sum + e.breakfast + e.lunch + e.snack + e.dinner,
    0,
  )
  return Math.round((total / (recent.length * 4)) * 100)
}

export function countWorkoutsMonth(entries: DailyEntry[]): number {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  return entries.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() === month && d.getFullYear() === year && (e.workout === 'A' || e.workout === 'B')
  }).length
}

export function averageField(entries: DailyEntry[], field: keyof DailyEntry, days = 7): number {
  const recent = entries.slice(-days).filter((e) => e[field] != null)
  if (recent.length === 0) return 0
  const sum = recent.reduce((acc, e) => acc + (Number(e[field]) || 0), 0)
  return Math.round((sum / recent.length) * 10) / 10
}

export function getWeightChartData(entries: DailyEntry[]) {
  return entries
    .filter((e) => e.weight != null)
    .map((e) => ({
      date: e.date.slice(5), // MM-DD
      weight: e.weight,
    }))
}

export function getMealChartData(entries: DailyEntry[], days = 14) {
  return entries.slice(-days).map((e) => ({
    date: e.date.slice(5),
    meals: e.breakfast + e.lunch + e.snack + e.dinner,
  }))
}

export function getSmokingChartData(entries: DailyEntry[], days = 14) {
  return entries.slice(-days).map((e) => ({
    date: e.date.slice(5),
    cigarettes: e.cigarettes,
  }))
}
