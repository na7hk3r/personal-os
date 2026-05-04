; Custom NSIS macros for Nora OS installer.
; Referenced opcionalmente desde electron-builder.yml > nsis.include.
;
; Por ahora dejamos el archivo vacio (placeholders) para evitar romper la build.
; Activar agregando "include: buildResources/installer.nsh" en el bloque nsis del YAML.

!macro customWelcomePage
  ; Pagina extra opcional pre-install. Dejar vacio para usar la default.
!macroend

!macro customInstall
  ; Acciones extra durante install (ej: registrar protocolo, escribir registry).
  !insertmacro NoraOsCheckOllama
!macroend

; -----------------------------------------------------------------------------
; Ollama detection
; -----------------------------------------------------------------------------
; Nora OS ofrece un copiloto IA local que requiere Ollama (https://ollama.com).
; La app funciona sin Ollama (modo offline), pero las funciones de IA estaran
; deshabilitadas. Detectamos Ollama via `ollama --version` y, si no esta
; instalado, ofrecemos al usuario abrir la pagina de descarga.
;
; Nota: usamos nsExec::ExecToStack en lugar de Exec porque PATH puede no estar
; refrescado durante install. La salida del comando va a $0 (exit code).
; -----------------------------------------------------------------------------
!macro NoraOsCheckOllama
  DetailPrint "Verificando Ollama (copiloto IA local)..."
  nsExec::ExecToStack 'cmd /c ollama --version'
  Pop $0 ; exit code
  Pop $1 ; output (descartado)
  ${If} $0 != 0
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Nora OS incluye un copiloto IA que funciona con Ollama (gratuito, local, privado).$\r$\n$\r$\nNo se detecto Ollama en este equipo. Las funciones de IA estaran deshabilitadas hasta que lo instales.$\r$\n$\r$\nQueres abrir la pagina de descarga de Ollama ahora?$\r$\n(Podes instalarlo despues; la app funciona igual sin IA)." \
      /SD IDNO IDYES OllamaOpenDownload IDNO OllamaSkipDownload
    OllamaOpenDownload:
      ExecShell "open" "https://ollama.com/download"
      Goto OllamaCheckDone
    OllamaSkipDownload:
      DetailPrint "Ollama omitido por el usuario. Funciones de IA deshabilitadas."
    OllamaCheckDone:
  ${Else}
    DetailPrint "Ollama detectado correctamente."
  ${EndIf}
!macroend

!macro customUnInstall
  ; Limpieza extra durante uninstall.
!macroend
