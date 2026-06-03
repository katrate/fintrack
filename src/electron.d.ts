interface ElectronAPI {
  platform: string
  minimize?: () => void
  maximize?: () => void
  close?: () => void

  // Auto-update
  onUpdateChecking: (cb: () => void) => () => void
  onUpdateAvailable: (cb: (info: any) => void) => () => void
  onUpdateNotAvailable: (cb: () => void) => () => void
  onUpdateDownloadProgress: (cb: (progress: any) => void) => () => void
  onUpdateDownloaded: (cb: (info: any) => void) => () => void
  onUpdateError: (cb: (error: string) => void) => () => void
  checkForUpdates: () => Promise<any>
  downloadUpdate: () => Promise<{ success: boolean }>
  installUpdate: () => Promise<{ success: boolean }>
  getVersion: () => Promise<string>
}

interface Window {
  electronAPI?: ElectronAPI
}
