const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Auto-update listeners
  onUpdateChecking: (cb) => {
    ipcRenderer.on('update:checking', cb)
    return () => ipcRenderer.removeListener('update:checking', cb)
  },
  onUpdateAvailable: (cb) => {
    const handler = (_event, info) => cb(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateNotAvailable: (cb) => {
    ipcRenderer.on('update:not-available', cb)
    return () => ipcRenderer.removeListener('update:not-available', cb)
  },
  onUpdateDownloadProgress: (cb) => {
    const handler = (_event, progress) => cb(progress)
    ipcRenderer.on('update:download-progress', handler)
    return () => ipcRenderer.removeListener('update:download-progress', handler)
  },
  onUpdateDownloaded: (cb) => {
    const handler = (_event, info) => cb(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateError: (cb) => {
    const handler = (_event, error) => cb(error)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getVersion: () => ipcRenderer.invoke('update:getVersion'),
})
