const { app, BrowserWindow } = require('electron')
const path = require('path')

const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', function connection (ws, req, client) {
  console.log('new connection')

  ws.send('server-success')

  ws.on('message', (data) => {
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    })
  })
})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

const createWindow = () => {
  const ratio = 1 // square room
  const height = 960

  const mainWindow = new BrowserWindow({
    height,
    width: (height * ratio)
  })

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

  mainWindow.webContents.openDevTools();
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
