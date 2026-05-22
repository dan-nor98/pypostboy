const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { validateDesktopRequestPayload } = require('../request-executor/validation');
const { executeDesktopRequest } = require('../request-executor');

const IPC_CHANNEL_EXECUTE = 'desktop:request:execute';

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadURL(process.env.PYPOSTBOY_URL || 'http://localhost:3001');
}

ipcMain.handle(IPC_CHANNEL_EXECUTE, async (_event, payload) => {
  const validPayload = validateDesktopRequestPayload(payload);
  return executeDesktopRequest(validPayload);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
