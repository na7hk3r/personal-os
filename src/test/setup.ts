import '@testing-library/jest-dom/vitest'

// Stub Electron bridges to avoid crashes in components/services that touch them.
const noop = async () => undefined as unknown as never

if (typeof window !== 'undefined') {
  // @ts-expect-error inject stubs
  window.storage ??= {
    query: async () => [],
    execute: async () => ({ changes: 0, lastInsertRowid: 0 }),
    getSetting: async () => null,
    setSetting: async () => undefined,
    getRecentEvents: async () => [],
  }
  // @ts-expect-error inject stubs
  window.notifications ??= { supported: async () => false, show: noop }
  // @ts-expect-error inject stubs
  window.ollama ??= {
    health: async () => ({ ok: false, baseUrl: '', error: 'stub' }),
    listModels: async () => [],
    generate: async () => ({ text: 'stub' }),
  }
  // @ts-expect-error inject stubs
  window.backup ??= {
    exportPlain: async () => ({ ok: false }),
    exportEncrypted: async () => ({ ok: false }),
    importPlain: async () => ({ ok: false }),
    importEncrypted: async () => ({ ok: false }),
  }
  // @ts-expect-error inject stubs
  window.auth ??= {}
}
