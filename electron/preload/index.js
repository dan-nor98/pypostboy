const { contextBridge, ipcRenderer } = require('electron');

const IPC_CHANNEL_EXECUTE = 'desktop:request:execute';

contextBridge.exposeInMainWorld('postboyDesktop', {
  isDesktop: true,
  executeRequest: (payload) => ipcRenderer.invoke(IPC_CHANNEL_EXECUTE, payload)
});
