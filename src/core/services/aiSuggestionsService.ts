import { aiContextService, type UserContextSnapshot } from './aiContextService'
import { ollamaService } from './ollamaService'

export interface AISuggestion {
  id: string
  text: string
  generatedAt: string
  /** Resumen de qué datos del usuario se usaron para auditar y dar transparencia */
  contextHint: string
}

const TASKS = {
  dailyCoach: {
    id: 'daily-coach',
    instruction:
      'Analizá los datos del usuario y respondé en MÁXIMO 3 oraciones: ' +
      'qué viene haciendo bien, qué señal de alerta hay y un único próximo paso accionable. ' +
      'No uses listas, no uses markdown, no uses emojis. Si no entrena hace varios días, motivá sin culpar.',
  },
  weeklyReview: {
    id: 'weekly-review',
    instruction:
      'Generá un review breve (máx 6 líneas) de la última semana del usuario: ' +
      'wins, lo que faltó, y una recomendación concreta para la semana que arranca. ' +
      'Usá lenguaje directo, sin emojis ni markdown.',
  },
  focusNudge: {
    id: 'focus-nudge',
    instruction:
      'En 1-2 oraciones, dale al usuario un empujón motivacional para arrancar una sesión de foco AHORA, ' +
      'usando algún dato real reciente (foco semanal, tareas pendientes, racha). Sin emojis, sin markdown.',
  },
} as const

const FREE_CHAT_TASK_ID = 'free-chat'

function buildFreeChatInstruction(userMessage: string): string {
  const safe = userMessage.replace(/"/g, '\\"').slice(0, 800)
  return [
    `El usuario pregunta: "${safe}".`,
    'Respondé en MÁXIMO 4 oraciones usando sus datos reales del contexto.',
    'Tono: español rioplatense con vos. Sin emojis, sin markdown, sin moralizar.',
    'Si implicás una acción concreta, agregá AL FINAL una sola línea con uno de estos formatos exactos:',
    'ACCIÓN: INICIAR_FOCO',
    'ACCIÓN: CREAR_TAREA: <texto corto de la tarea>',
    'ACCIÓN: REGISTRAR_HABITO: <id-o-nombre-del-hábito>',
    'Si no hay acción clara, no agregues la línea ACCIÓN.',
  ].join('\n')
}

export type AISuggestionKind = keyof typeof TASKS

function buildPrompt(kind: AISuggestionKind, snapshot: UserContextSnapshot): string {
  const context = aiContextService.asPromptContext(snapshot)
  const { instruction } = TASKS[kind]
  return [
    'CONTEXTO REAL DEL USUARIO (datos de su Personal OS local):',
    context,
    '',
    'TAREA:',
    instruction,
  ].join('\n')
}

function summarizeContext(snapshot: UserContextSnapshot): string {
  const parts: string[] = []
  if (snapshot.fitness) parts.push(`fitness ${snapshot.fitness.daysWithDataLast7}/7 días`)
  if (snapshot.work) parts.push(`work ${snapshot.work.activeCards} activas`)
  if (snapshot.planner) parts.push(`planner ${snapshot.planner.pendingToday} pendientes hoy`)
  parts.push(`gamif L${snapshot.gamification.level}`)
  return parts.join(' · ')
}

export const aiSuggestionsService = {
  async generate(kind: AISuggestionKind): Promise<AISuggestion> {
    const ready = await ollamaService.isReady()
    if (!ready.enabled) throw new Error('Ollama está deshabilitado en Control Center')
    if (!ready.healthy) throw new Error(`Ollama no responde: ${ready.reason ?? 'sin detalle'}`)
    const snapshot = await aiContextService.snapshot()
    const prompt = buildPrompt(kind, snapshot)
    const text = await ollamaService.generate(prompt)
    return {
      id: `${kind}-${Date.now()}`,
      text: text.trim(),
      generatedAt: new Date().toISOString(),
      contextHint: summarizeContext(snapshot),
    }
  },

  /**
   * Conversación libre con el copiloto. Usa el snapshot real del usuario y
   * permite que la IA sugiera una acción ejecutable al final de la respuesta.
   */
  async freeChat(userMessage: string): Promise<AISuggestion> {
    const ready = await ollamaService.isReady()
    if (!ready.enabled) throw new Error('Ollama está deshabilitado en Control Center')
    if (!ready.healthy) throw new Error(`Ollama no responde: ${ready.reason ?? 'sin detalle'}`)
    const snapshot = await aiContextService.snapshot()
    const context = aiContextService.asPromptContext(snapshot)
    const prompt = [
      'CONTEXTO REAL DEL USUARIO (datos de su Personal OS local):',
      context,
      '',
      'TAREA:',
      buildFreeChatInstruction(userMessage),
    ].join('\n')
    const text = await ollamaService.generate(prompt)
    return {
      id: `${FREE_CHAT_TASK_ID}-${Date.now()}`,
      text: text.trim(),
      generatedAt: new Date().toISOString(),
      contextHint: summarizeContext(snapshot),
    }
  },
}
