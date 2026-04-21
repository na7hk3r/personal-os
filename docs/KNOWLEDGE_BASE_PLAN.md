# Plan de Knowledge Base (sitio web de documentación)

Este documento propone cómo evolucionar la documentación actual (`docs/*.md`) a una knowledge base web integrada al proyecto.

## Cuándo dar el salto

Migrar a sitio cuando ocurra al menos uno de estos criterios:

- Más de 12 documentos técnicos activos.
- Más de 3 equipos/personas editando documentación.
- Necesidad de búsqueda global, versionado de docs y navegación por dominios.

## Objetivos de la knowledge base

- Navegación por dominios (`core`, `plugins`, `database`, `ui`, `ops`).
- Búsqueda full-text.
- Versionado por release (`v1.2`, `v1.3`, etc.).
- Páginas de guías rápidas y runbooks operativos.

## Arquitectura recomendada

Opción preferida: Docusaurus.

- Fuente: markdown existente en `docs/`.
- Build estático versionable.
- Deploy simple en GitHub Pages, Vercel o Netlify.

Alternativa liviana: VitePress.

## Estructura sugerida del sitio

```text
/docs-site
  /core
  /plugins
  /database
  /events
  /gamification
  /guides
  /release-notes
```

## Fases de implementación

1. Fase 0: Estandarizar markdown actual.
2. Fase 1: Crear sitio con secciones base y sidebar.
3. Fase 2: Migrar docs existentes sin romper rutas internas.
4. Fase 3: Añadir buscador y versionado por release.
5. Fase 4: Integrar checklist de docs en PR template.

## Gobierno de documentación

- Cada feature PR debe incluir actualización de docs si cambia contrato o UX.
- Cada release debe incluir notas técnicas y funcionales.
- Owner sugerido por área:
  - Core: arquitectura y eventos.
  - Plugins: estructura, integración y runbooks.
  - Producto: guías funcionales de uso.

## Entregables mínimos para iniciar

- Sidebar inicial del sitio.
- Página Home con mapa de documentación.
- Índices por dominio.
- Primer bloque de release notes (`v1.2.0`).
