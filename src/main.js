const { app, BrowserWindow } = require('electron')
const path = require('path')
const OSC = require('osc-js')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

// udp server: localhost:41234
// udp client: localhost:41235
// ws: localhost:8080
const osc = new OSC({ plugin: new OSC.BridgePlugin({
  udpServer: { host: '10.93.171.155' }
}) })

const createWindow = () => {
  const ratio = 1 // square room
  const height = 960

  const mainWindow = new BrowserWindow({
    height,
    width: (height * ratio)
  })

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
  osc.open()

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
