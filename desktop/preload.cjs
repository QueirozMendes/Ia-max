const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('maxDeveloper', Object.freeze({
  choose:()=>ipcRenderer.invoke('max-dev:choose'),
  propose:(task,paths)=>ipcRenderer.invoke('max-dev:propose',task,paths),
  codex:task=>ipcRenderer.invoke('max-dev:codex',task),
  test:paths=>ipcRenderer.invoke('max-dev:test',paths),
  apply:()=>ipcRenderer.invoke('max-dev:apply'),
  revoke:()=>ipcRenderer.invoke('max-dev:revoke')
}));

contextBridge.exposeInMainWorld('maxAutonomy',Object.freeze({
 status:()=>ipcRenderer.invoke('max-autonomy:status'),
 setEnabled:enabled=>ipcRenderer.invoke('max-autonomy:enabled',enabled),
 presence:value=>ipcRenderer.send('max-autonomy:presence',value)
}));

contextBridge.exposeInMainWorld('maxSensors',Object.freeze({microphone:()=>ipcRenderer.invoke('max-sensors:microphone'),camera:()=>ipcRenderer.invoke('max-sensors:camera'),screen:()=>ipcRenderer.invoke('max-sensors:screen'),systemAudio:()=>ipcRenderer.invoke('max-sensors:system-audio')}));
