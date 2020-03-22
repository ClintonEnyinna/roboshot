const { app, BrowserWindow } = require('electron');
const path = require('path');
const ipc = require('electron').ipcMain;
let status = 0;

let mainWindow;
let externalWindow;

function createWindow() {
  const { screen } = require('electron');
  let displays = screen.getAllDisplays();

  let externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0
  })

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: path.join(__dirname, './img/beer.ico'),
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  });
  
  mainWindow.loadFile('index.html')

  if (externalDisplay) {
    externalWindow = new BrowserWindow({
      x: externalDisplay.bounds.x + 50,
      y: externalDisplay.bounds.y + 50,
      webPreferences: {
        // preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true
      }
    })
    externalWindow.loadFile('external.html');

    externalWindow.on('close', function (e) {
      externalWindow = null;
    });
  }

  mainWindow.on('close', function (e) {
    if (status == 0) {
      if (mainWindow) {
        e.preventDefault();
        mainWindow.webContents.send('app-close');
      }
    }
  });
}

// Electron has finished initialization and is ready to create browser windows.
app.on('ready', createWindow);

ipc.on('drink-ordered', (e, arg) => {
  console.log(arg);
  if (externalWindow){
    externalWindow.webContents.send('order-info', arg);
  }
  else{
    console.log("order received", externalWindow);
  }
});

ipc.on('closed', _ => {
  status = 1;
  mainWindow = null;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
