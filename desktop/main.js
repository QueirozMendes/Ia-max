import { app, BrowserWindow, Tray, Menu, nativeImage, session, dialog, globalShortcut } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
try { process.loadEnvFile(join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida');
const origin = 'http://127.0.0.1:' + port;
const password = process.env.MAX_REMOTE_PASSWORD;
let main, tray, quitting = false, microphoneAllowed = false;
const trusted = url => { try { return new URL(url).origin === origin; } catch { return false; } };
function show() { if (main) { main.show(); main.focus(); } }
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', show);
  app.whenReady().then(() => {
    const ses = session.fromPartition('max-desktop');
    ses.setPermissionCheckHandler((wc, permission, requestingOrigin, details) =>
      wc === main?.webContents && trusted(requestingOrigin) && permission === 'media' &&
      microphoneAllowed && details.mediaType === 'audio');
    ses.setPermissionRequestHandler((wc, permission, callback, details) => {
      const audioOnly = details.mediaTypes?.length === 1 && details.mediaTypes[0] === 'audio';
      callback(wc === main?.webContents && trusted(details.requestingUrl) && permission === 'media' && audioOnly && microphoneAllowed);
    });
    main = new BrowserWindow({
      width: 1100, height: 780, minWidth: 360, minHeight: 480, show: false,
      title: 'Max', backgroundColor: '#15131e',
      webPreferences: { session: ses, contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true }
    });
    main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    main.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
    main.webContents.on('will-redirect', (event, url) => { if (!trusted(url)) event.preventDefault(); });
    app.on('login', (event, wc, details, auth, callback) => {
      if (wc !== main?.webContents || auth.isProxy || !trusted(details.url) || !password || !process.env.MAX_REMOTE_ORIGIN) return;
      event.preventDefault();
      callback('max', password);
    });
    main.on('close', event => { if (!quitting) { event.preventDefault(); main.hide(); } });
    main.once('ready-to-show', show);
    const icon = nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#6946ad"/><path d="M16 4L19 13L28 16L19 19L16 28L13 19L4 16L13 13Z" fill="white"/></svg>').toString('base64'));
    tray = new Tray(icon);
    tray.setToolTip('Max · Assistente pessoal');
    function refreshMenu() {
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Abrir Max', click: show },
        { label: 'Sempre visível', type: 'checkbox', checked: main.isAlwaysOnTop(), click: item => main.setAlwaysOnTop(item.checked) },
        { label: 'Permitir microfone nesta sessão', type: 'checkbox', checked: microphoneAllowed, click: item => {
          microphoneAllowed = item.checked;
          if (!microphoneAllowed) main.webContents.reload();
          refreshMenu();
        }},
        { label: 'Recarregar conexão', click: () => main.loadURL(origin).catch(() => {}) },
        { type: 'separator' },
        { label: 'Sair da Max (Core permanece ativo)', click: () => app.quit() }
      ]));
    }
    refreshMenu();
    tray.on('double-click', show);
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      microphoneAllowed = false;
      main.webContents.reload();
      refreshMenu();
    });
    main.loadURL(origin).catch(() => {
      dialog.showErrorBox('Max Core indisponível', 'Inicie o Core com npm start ou pelo Agendador do Windows. Depois use Recarregar conexão na bandeja.');
      show();
    });
  }).catch(error => { dialog.showErrorBox('Max', error.message); app.quit(); });
  app.on('before-quit', () => { quitting = true; globalShortcut.unregisterAll(); });
  app.on('window-all-closed', () => {});
}
