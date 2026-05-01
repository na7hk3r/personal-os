; Custom NSIS macros for Personal OS installer.
; Referenced opcionalmente desde electron-builder.yml > nsis.include.
;
; Por ahora dejamos el archivo vacio (placeholders) para evitar romper la build.
; Activar agregando "include: buildResources/installer.nsh" en el bloque nsis del YAML.

!macro customWelcomePage
  ; Pagina extra opcional pre-install. Dejar vacio para usar la default.
!macroend

!macro customInstall
  ; Acciones extra durante install (ej: registrar protocolo, escribir registry).
!macroend

!macro customUnInstall
  ; Limpieza extra durante uninstall.
!macroend
