import { create } from 'zustand'
import type { Board, Column, Card, Note, Link } from './types'

interface WorkState {
  boards: Board[]
  columns: Column[]
  cards: Card[]
  notes: Note[]
  links: Link[]

  setBoards: (boards: Board[]) => void
  setColumns: (columns: Column[]) => void
  setCards: (cards: Card[]) => void
  setNotes: (notes: Note[]) => void
  setLinks: (links: Link[]) => void

  addCard: (card: Card) => void
  updateCard: (id: string, updates: Partial<Card>) => void
  deleteCard: (id: string) => void
  moveCard: (cardId: string, toColumnId: string, position: number) => void

  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
}

export const useWorkStore = create<WorkState>((set) => ({
  boards: [],
  columns: [],
  cards: [],
  notes: [],
  links: [],

  setBoards: (boards) => set({ boards }),
  setColumns: (columns) => set({ columns }),
  setCards: (cards) => set({ cards }),
  setNotes: (notes) => set({ notes }),
  setLinks: (links) => set({ links }),

  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),

  updateCard: (id, updates) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  deleteCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

  moveCard: (cardId, toColumnId, position) =>
    set((s) => ({
      cards: s.cards.map((c) =>
        c.id === cardId ? { ...c, columnId: toColumnId, position } : c,
      ),
    })),

  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),

  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
}))
