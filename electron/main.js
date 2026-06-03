const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { join, dirname } = require('path')
const { autoUpdater } = require('electron-updater')

let mainWindow = null
const isDev = !!process.env.VITE_DEV_SERVER_URL

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#080c18',
    icon: join(__dirname, isDev ? '../public/logo.png' : '../dist/logo.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

/* ── Auto Updater ── */

if (!isDev) {
  autoUpdater.autoDownload = false

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update:checking')
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', info)
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:download-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update:error', err?.message || 'Unknown error')
  })
}

app.whenReady().then(() => {
  createWindow()

  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 5000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

/* ── IPC: Window Controls ── */

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.close())

/* ── IPC: Auto-Update ── */

ipcMain.handle('update:check', async () => {
  if (isDev) return { error: 'Cannot check for updates in development mode' }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { result }
  } catch (err) {
    return { error: err?.message || 'Failed to check for updates' }
  }
})

ipcMain.handle('update:download', async () => {
  if (isDev) return { error: 'Cannot download updates in development mode' }
  autoUpdater.downloadUpdate()
  return { success: true }
})

ipcMain.handle('update:install', async () => {
  autoUpdater.quitAndInstall()
  return { success: true }
})

ipcMain.handle('update:getVersion', async () => {
  return app.getVersion()
})
