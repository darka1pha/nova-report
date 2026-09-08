import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getSystemFonts: () => Promise<string[]>;
  openFileDialog: () => Promise<{ canceled: boolean; filePath?: string; content?: string }>;
  saveFileDialog: (defaultName: string, content: string) => Promise<{ canceled: boolean; filePath?: string }>;
  printReport: () => Promise<void>;
}

const api: ElectronAPI = {
  getSystemFonts: () => ipcRenderer.invoke('get-system-fonts'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (defaultName, content) => ipcRenderer.invoke('save-file-dialog', { defaultName, content }),
  printReport: () => ipcRenderer.invoke('print-report')
};

contextBridge.exposeInMainWorld('electronAPI', api);
