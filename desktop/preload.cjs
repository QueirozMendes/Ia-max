const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('maxDeveloper', Object.freeze({
  choose:()=>ipcRenderer.invoke('max-dev:choose'),
  propose:(task,paths)=>ipcRenderer.invoke('max-dev:propose',task,paths),
  codex:task=>ipcRenderer.invoke('max-dev:codex',task),
  test:paths=>ipcRenderer.invoke('max-dev:test',paths),
  apply:()=>ipcRenderer.invoke('max-dev:apply'),
  revoke:()=>ipcRenderer.invoke('max-dev:revoke')
}));
