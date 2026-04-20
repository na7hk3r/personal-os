export interface Board {
  id: string
  name: string
}

export interface Column {
  id: string
  boardId: string
  name: string
  position: number
}

export interface Card {
  id: string
  columnId: string
  title: string
  description: string
  content: string
  labels: string[]
  dueDate: string | null
  position: number
}

export interface FocusSession {
  id: string
  taskId: string | null
  startTime: number
  endTime?: number
  duration?: number
  interrupted: boolean
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Link {
  id: string
  title: string
  url: string
  category: string
}
