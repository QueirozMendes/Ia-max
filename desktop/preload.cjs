const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('maxDeveloper', Object.freeze({
  choose:()=>ipcRenderer.invoke('max-dev:choose'),
  propose:(task,paths)=>ipcRenderer.invoke('max-dev:propose',task,paths),
  apply:()=>ipcRenderer.invoke('max-dev:apply'),
  revoke:()=>ipcRenderer.invoke('max-dev:revoke')
}));
