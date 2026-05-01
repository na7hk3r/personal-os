import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../sections/Hero'

describe('Hero', () => {
  it('renderiza el título principal y subtítulo', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Personal OS/i)
    expect(
      screen.getByText(/Tu sistema operativo personal modular/i),
    ).toBeInTheDocument()
  })

  it('muestra el CTA de descarga y el enlace a GitHub', () => {
    render(<Hero />)
    // Botón de descarga (puede decir "Cargando…" hasta resolver fetch)
    expect(
      screen.getByRole('link', { name: /descargar|cargando/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver en github/i })).toHaveAttribute(
      'href',
      'https://github.com/na7hk3r/personal-os',
    )
  })
})
