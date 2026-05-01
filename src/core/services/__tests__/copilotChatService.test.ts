import { describe, expect, it } from 'vitest'
import { __parseCopilotAction } from '../copilotChatService'

describe('copilotChatService.parseAction', () => {
  it('extrae INICIAR_FOCO sin payload', () => {
    const { clean, action } = __parseCopilotAction(
      'Dale, arrancá ahora con foco en la propuesta.\nACCIÓN: INICIAR_FOCO',
    )
    expect(action?.kind).toBe('INICIAR_FOCO')
    expect(action?.payload).toBeUndefined()
    expect(clean).toBe('Dale, arrancá ahora con foco en la propuesta.')
  })

  it('extrae CREAR_TAREA con payload', () => {
    const { clean, action } = __parseCopilotAction(
      'Te conviene anotarlo. ACCIÓN: CREAR_TAREA: Llamar al cliente Z',
    )
    expect(action?.kind).toBe('CREAR_TAREA')
    expect(action?.payload).toBe('Llamar al cliente Z')
    expect(clean).toBe('Te conviene anotarlo.')
  })

  it('soporta el acento O sin tilde y corchetes en payload', () => {
    const { action } = __parseCopilotAction('ACCION: REGISTRAR_HABITO: [meditacion]')
    expect(action?.kind).toBe('REGISTRAR_HABITO')
    expect(action?.payload).toBe('meditacion')
  })

  it('devuelve action null si no matchea', () => {
    const { clean, action } = __parseCopilotAction('Solo info, sin acción.')
    expect(action).toBeNull()
    expect(clean).toBe('Solo info, sin acción.')
  })
})
