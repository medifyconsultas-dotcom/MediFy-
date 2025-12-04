import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // Adicionar APIs específicas do Electron se necessário
})

