const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

// Helper to load saved window state
function loadWindowState() {
  try {
    if (fs.existsSync(stateFilePath)) {
      return JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
  } catch (err) {
    console.error("Failed to load window state:", err);
  }
  return null;
}

// Helper to save window state
function saveWindowState(state) {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFilePath, JSON.stringify(state), 'utf8');
  } catch (err) {
    console.error("Failed to save window state:", err);
  }
}

// Default state if nothing is saved
let windowState = loadWindowState() || {
  width: 1600, // Open larger by default
  height: 1000,
  isMaximized: false
};

function createWindow() {
  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    title: "Spatial Canvas Browser",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
    backgroundColor: '#0b0f19'
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Save state on change
  const updateState = () => {
    if (!mainWindow.isDestroyed()) {
      const isMaximized = mainWindow.isMaximized();
      if (!isMaximized) {
        const bounds = mainWindow.getBounds();
        windowState.x = bounds.x;
        windowState.y = bounds.y;
        windowState.width = bounds.width;
        windowState.height = bounds.height;
      }
      windowState.isMaximized = isMaximized;
      saveWindowState(windowState);
    }
  };

  mainWindow.on('resize', updateState);
  mainWindow.on('move', updateState);
  mainWindow.on('close', updateState);

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  setupMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('web-contents-created', (event, webContents) => {
  // If it is a guest webContents (like a webview), listen to mouse back/forward clicks
  if (webContents !== mainWindow?.webContents) {
    webContents.on('input-event', (event, input) => {
      if (input.type === 'mouseDown') {
        if (input.button === 'back') {
          if (webContents.canGoBack()) {
            webContents.goBack();
          }
        } else if (input.button === 'forward') {
          if (webContents.canGoForward()) {
            webContents.goForward();
          }
        }
      }
    });
  }

  // Intercept window creation requests (like target="_blank", middle click, window.open)
  webContents.setWindowOpenHandler((details) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('spawn-spatial-window', {
        url: details.url,
        parentWebContentsId: webContents.id
      });
    }
    return { action: 'deny' }; // Prevent native window creation
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('spawn-spatial-window', { url: 'about:blank' });
            }
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('close-active-window');
            }
          }
        },
        {
          label: 'Reopen Closed Tab',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('reopen-last-closed-window');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.close();
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin' ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

