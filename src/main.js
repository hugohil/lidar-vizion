const { app, BrowserWindow } = require('electron')
const path = require('path')

const settings = require('./settings')

const OSC = require('osc-js')

// 192.168.2.39

const config = Object.assign({
  receiver: 'udp',
  udpServer: {
    host: '0.0.0.0',
    port: 41234
  },
  udpClient: {
    host: '0.0.0.0',
    port: 41235
  }
}, settings.oscBridgeConfig)
const osc = new OSC({ plugin: new OSC.BridgePlugin(config) })

osc.open()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

const createWindow = () => {
  const ratio = 1 // square room
  const height = 980

  const mainWindow = new BrowserWindow({
    height,
    resizable: false,
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
