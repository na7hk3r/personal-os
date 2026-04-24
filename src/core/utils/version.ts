/**
 * Versión de la app inyectada en build-time desde `package.json`
 * (ver electron.vite.config.ts → `__APP_VERSION__`).
 *
 * Se persiste en `localStorage` cada vez que cambia, garantizando integridad
 * entre lo que muestran Sidebar y Footer y la versión real del build.
 */

const STORAGE_KEY = 'app.version'

function readStored(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // localStorage bloqueado — ignorar.
  }
}

const compileTimeVersion: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

// Sincronizar storage con la versión actual al cargar el módulo.
const previous = readStored()
if (previous !== compileTimeVersion) {
  writeStored(compileTimeVersion)
  if (previous && previous !== compileTimeVersion) {
    // Útil para auditoría de upgrades.
     
    console.info(`[app] version updated: ${previous} → ${compileTimeVersion}`)
  }
}

export const APP_VERSION: string = compileTimeVersion
