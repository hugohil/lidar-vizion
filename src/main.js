const { app, BrowserWindow } = require('electron')
const path = require('path')

const { Server } = require('socket.io');

const io = new Server(3000);
console.log('socket.io server listening on port 3000');

io.on("connection", (socket) => {
  const { id } = socket;
  console.log('socket connected.', id);

  socket.broadcast.emit('register', id);

  socket.on("disconnect", () => {
    socket.broadcast.emit('unregister', id);
  });

  socket.on('data', (data) => {
    socket.broadcast.emit('lidar-data', { id, data });
  });
});

const OSC = require('osc-js')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

const createWindow = () => {
  const ratio = 1 // square room
  const height = 980

  const mainWindow = new BrowserWindow({
    height,
    // resizable: false,
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
