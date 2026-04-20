import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerStorageIpc } from './services/storage-ipc'
import { DatabaseService } from './services/database'

let mainWindow: BrowserWindow | null = null
const rendererUrl = process.env.ELECTRON_RENDERER_URL
const isDebugDevtoolsEnabled = process.env.ELECTRON_DEBUG_DEVTOOLS === 'true'

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open DevTools only when explicitly requested in development.
  if (rendererUrl && isDebugDevtoolsEnabled) {
    mainWindow.webContents.openDevTools()
  }

  // Dev: load vite dev server. Prod: load built files.
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const db = DatabaseService.getInstance()
  db.initialize()
  registerStorageIpc(db)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
