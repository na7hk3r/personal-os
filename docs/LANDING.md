# Landing Page

Sitio web público de Nora OS, deployado en GitHub Pages:

🌐 **https://na7hk3r.github.io/personal-os/**

Stack: **Vite + React 19 + TypeScript + TailwindCSS**, sin backend.

---

## Estructura

```
landing/
  package.json
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  index.html
  public/
    favicon.svg
    og-image.svg
    robots.txt
    sitemap.xml
    screenshots/         # PNGs de la app (dashboard, plugins, auditor)
  src/
    main.tsx
    App.tsx
    components/          # Button, Section, DownloadButton, ThemeToggle
    sections/            # Hero, Features, Plugins, Screenshots, Download, FAQ, Footer
    data/                # features, plugins, faq (datos estáticos)
    hooks/               # useLatestRelease, useDetectOS
    styles/index.css     # tokens y reset
    test/                # vitest specs
```

---

## Desarrollo local

```bash
cd landing
npm install
npm run dev          # http://localhost:5173/personal-os/
```

> El sitio usa `base: '/personal-os/'` para GitHub Pages, por eso la URL local incluye el prefijo.

### Otros scripts

| Script | Qué hace |
| --- | --- |
| `npm run build` | Genera el sitio estático en `landing/dist/`. |
| `npm run preview` | Sirve el build local para verificar. |
| `npm run typecheck` | Corre `tsc --noEmit`. |
| `npm test` | Corre vitest (tests de Hero, DownloadButton, useLatestRelease, detectOS). |

---

## Deploy

El deploy es **automático** vía GitHub Actions. Cualquier push a `main` que toque `landing/**` (o el propio workflow) dispara `.github/workflows/landing.yml`, que:

1. Instala dependencias en `landing/`.
2. Corre `typecheck` + `test`.
3. Construye con `npm run build`.
4. Sube `landing/dist/` como artifact de Pages.
5. Despliega en `github-pages`.

El primer deploy requiere habilitar Pages manualmente:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Mergear cualquier cambio a `main` que toque `landing/`.
3. La URL final aparece en la pestaña **Actions** del repo.

También se puede disparar manualmente con **Run workflow** desde la pestaña Actions.

---

## Cómo agregar capturas

1. Exportá la captura como PNG (1600×1000 px recomendado, 16:10).
2. Guardala en `landing/public/screenshots/` con nombre estable (`dashboard.png`, `plugins.png`, `auditor.png`).
3. Si querés agregar capturas nuevas (no las tres por defecto), editá `landing/src/sections/Screenshots.tsx` y agregá un objeto al array `shots`.

Si una captura falta, la grilla muestra un placeholder discreto en su lugar (no rompe el build).

---

## Cómo agregar plugins a la landing

Los plugins se listan estáticamente en `landing/src/data/plugins.ts`. Para agregar uno:

```ts
{
  id: 'mi-plugin',
  name: 'Mi Plugin',
  description: 'Una línea.',
  domain: 'productivity',
  domainLabel: 'Productividad',
  icon: Briefcase,           // de lucide-react
  accent: 'from-purple-500/30 to-fuchsia-500/10',
}
```

> El array de la landing es independiente del manifest del plugin en el app — se duplica deliberadamente para que la landing pueda buildearse sin depender del workspace principal.

---

## Cómo agregar features

Editá `landing/src/data/features.ts` y agregá un objeto con `title`, `description` e `icon` (lucide-react). La grilla es responsiva (1 / 2 / 4 columnas).

---

## SEO

- `<title>`, `<meta description>`, OpenGraph y Twitter Card configurados en `index.html`.
- `favicon.svg` (128 px) y `og-image.svg` (1200×630).
- `robots.txt` permite todo + apunta al sitemap.
- `sitemap.xml` mínimo (URL raíz).

Para mejorar el OG image en redes que no parsean SVG, generá un `og-image.png` y reemplazá las referencias en `index.html`.

---

## Hook `useLatestRelease`

Consulta `https://api.github.com/repos/na7hk3r/personal-os/releases/latest` y:

- Cachea la respuesta en `sessionStorage` por **10 minutos**.
- Clasifica los assets por SO/tipo (`windows`, `windowsPortable`, `linuxAppImage`, `linuxDeb`, `macDmg`).
- Si la API falla, `error` se setea y el `DownloadButton` cae al fallback `https://github.com/.../releases`.

El componente `DownloadButton` autodetecta el SO con `navigator.userAgent` (vía `useDetectOS`) y enlaza al asset correspondiente. En tests se puede forzar con `forceOS="windows" | "mac" | "linux" | "unknown"`.

---

## Tests

```bash
cd landing
npm test
```

Cobertura:

- `Hero.test.tsx` — render del título, subtítulo y CTAs.
- `DownloadButton.test.tsx` — selección de asset por SO, fallback, detección de userAgent.
- `useLatestRelease.test.ts` — fetch, cache en sessionStorage, manejo de errores, clasificación de assets.

---

## Validación

Antes de mergear cambios significativos:

```bash
cd landing
npm install
npm run typecheck
npm test
npm run build
```

Verificar que `landing/dist/index.html` contenga rutas con prefijo `/personal-os/`.

### Lighthouse

Objetivo: **≥ 90** en Performance, Accessibility, Best Practices y SEO. Para correr local:

```bash
npm install -g @lhci/cli
cd landing
npm run build && npx serve dist
# en otra terminal
lhci autorun --collect.url=http://localhost:3000/personal-os/
```
