import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Polyfill IntersectionObserver para framer-motion (whileInView) en jsdom.
class IntersectionObserverMock {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  // @ts-expect-error — asignamos el polyfill al global de jsdom
  globalThis.IntersectionObserver = IntersectionObserverMock
}

// matchMedia polyfill (algunos componentes pueden consultarlo)
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
