# Changelog - Personal OS

## [1.3.0] - 2026-04-22

### ✨ Nuevas características

#### Sistema de autenticación multiusuario
- **Autenticación local y segura**: Registro, login y recuperación de acceso completamente offline
- **Multiusuario con aislamiento total**: Cada usuario tiene su propia base de datos, configuración y plugins
- **Auto-login**: Sesiones persistentes que se restauran automáticamente en el siguiente inicio
- **Recuperación de acceso**: Reseteado de contraseña mediante pregunta secreta personalizada
- **IPC seguro**: Implementación de auth via preload script con context isolation
- **Criptografía robusta**: Hasheado con scrypt + salt aleatorio, timing-safe comparison

### 🎨 Mejoras de UX

#### Mensajes de error mejorados
- Todos los mensajes de error ahora son **claros, concisos y amigables**
- Validaciones progresivas con feedback inmediato
- Sugerencias útiles en cada paso (ej: "mínimo X caracteres")
- Distinciones entre errores de formato y errores de operación

#### Interfaz de autenticación
- UI moderna y responsive con 3 modos: Login, Registro, Recuperación
- Indicadores visuales mejorados con iconos (CheckCircle2 para éxito, AlertCircle para errores)
- Mejor diseño de inputs con placeholders descriptivos
- Animaciones y transiciones suaves
- Colores consistentes con tema de la aplicación

### 🔒 Seguridad

- **Bases de datos separadas**: `auth.db` (global) + `personal-os-user-{userId}.db` (por usuario)
- **Sesiones seguras**: Almacenadas con revocación explícita, no en localStorage
- **Validación robusta**: Todas las entradas validadas tanto frontend como backend
- **Preload script seguro**: Bridge entre main y renderer con APIs tipadas
- **No eval ni innerHTML**: UI construida 100% con JSX declarativo

### 📚 Documentación

- Nuevo archivo `docs/AUTH.md` con documentación técnica completa del sistema de autenticación
- Guías de arquitectura, flujos de usuario, migración legacy DB
- FAQ sobre recuperación, sincronización y seguridad
- Roadmap futuro (biometría, sincronización E2E, auditoría)

### 📝 Actualización de README

- Nueva sección "Autenticación y multiusuario" con descripción de características
- Datos técnicos resumidos de implementación
- Links a documentación técnica detallada

### 🔄 Migración automática

- Si existe `personal-os.db` (single-user legacy) al momento del primer registro, se reclaima automáticamente
- Todos los datos históricos quedan disponibles para el usuario que crea la primera cuenta
- Próximos usuarios crean sus propias bases de datos limpias

### 📦 Cambios técnicos

#### Nuevos archivos
- `electron/services/auth.ts` - Core service de autenticación
- `electron/services/auth-ipc.ts` - IPC handlers para operaciones auth
- `src/core/state/authStore.ts` - Zustand store para estado global de auth
- `src/core/ui/auth/AuthScreen.tsx` - Componente UI completo de autenticación
- `docs/AUTH.md` - Documentación técnica

#### Modificaciones principales
- `electron/main.ts` - Inicialización de AuthService y registro de IPC handlers
- `electron/preload.ts` - Exposición segura de auth bridge via contextBridge
- `src/core/types.ts` - Tipos para AuthUser, payloads y AuthBridge
- `src/global.d.ts` - Declaración de window.auth en tipos globales
- `src/App.tsx` - Gating de autenticación, carga de sesión al inicio
- `src/core/ui/Sidebar.tsx` - Botón de logout en navegación
- `package.json` - Versión incrementada a 1.3.0
- `README.md` - Sección nueva sobre autenticación

### 🧪 Testing

Manual testing completado:
- ✅ Crear cuenta nueva con múltiples usuarios
- ✅ Login/logout seguro
- ✅ Auto-login en siguiente inicio
- ✅ Aislamiento de datos entre usuarios
- ✅ Recuperación de contraseña via pregunta secreta
- ✅ Validaciones de todos los campos
- ✅ Mensajes de error en español
- ✅ Migración automática de legacy DB

### 📋 Requisitos de sistema

Sin cambios en requisitos:
- Node.js 20+
- npm 9+
- Windows: Visual Studio Build Tools 2022
- macOS: Command Line Tools
- Linux: build-essential

### 🚀 Deployment

**Procedimiento de liberación**:
1. ✅ Build de producción: `npm run build`
2. ✅ Typecheck: `npm run typecheck` (16 errores preexistentes no relacionados a auth)
3. ✅ Cambio de versión: actualizado en package.json y README.md
4. ✅ Documentación: AUTH.md + README.md actualizados
5. ✅ Changelog: este archivo
6. Pasos siguientes:
   - Commit: `git commit -m "Release v1.3.0: Sistema de autenticación multiusuario"`
   - Tag: `git tag v1.3.0`
   - Push: `git push origin main --tags`

### ⚠️ Consideraciones conocidas

- **No sincronización multi-dispositivo**: Por diseño local-first. Se puede agregar en futuro con E2E encryption
- **Sin OAuth/SSO**: Autenticación local únicamente por requisito del usuario
- **Session storage**: Sesiones persisten en auth.db. Logout explícito requerido para revocación
- **Offline-only**: No hay backend. Funciona 100% sin conexión a internet

### 🔮 Roadmap futuro

- [ ] Sincronización entre dispositivos con E2E encryption
- [ ] Autenticación biométrica (fingerprint/face)
- [ ] Auditoría de acceso (logs de login/logout)
- [ ] Configuración de políticas de contraseña
- [ ] Exportar/importar perfil de usuario

---

**Versión anterior**: [1.2.0] - 2026-04-XX

Ver commits individuales para historial completo de cambios.
