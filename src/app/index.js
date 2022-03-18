const socket = io('http://127.0.0.1:3000');

let lidar = {};
socket.on('register', (id) => {
  console.log(`register ${id}`);
  lidar[id] = new Device(id);
});
socket.on('unregister', (id) => {
  console.log(`unregister ${id}`);
  if (lidar[id]) {
    lidar[id].close();
    delete lidar[id];
  }
});
socket.on('lidar-data', ({ id, data }) => {
  if (!lidar[id]) {
    console.log(`register ${id}`);
    lidar[id] = new Device(id);
  }
  lidar[id].data = data;
});

const devices = {}

const throttle = (func, delay) => {
  let toThrottle = false
  return function() {
    if(!toThrottle) {
      toThrottle = true
      func.apply(this,arguments)
      setTimeout(() => {
        toThrottle = false
      }, delay)
    }
  }
}

const lidarImageDownsample = 0.5
const rescaleFactor = (1 / lidarImageDownsample)

const pane = new Tweakpane.Pane({ title: 'opts' });

let preset = localStorage.getItem('preset');
try {
  pane.importPreset(JSON.parse(preset));
} catch (ignore) {}
const saveButton = pane.addButton({ title: 'Save'}).on('click', () => {
  preset = pane.exportPreset();
  localStorage.setItem('preset', JSON.stringify(preset));
});

class Device {
  constructor (id) {
    this.data = [];

    this.params = {
      offsetX: 0,
      offsetY: 0,
      scale: 10,
      rotation: 0
    }

    this.gui = pane.addFolder({ title: `device ${id}` });
    this.gui.addInput(this.params, 'offsetX', {
      min: -(canvas.width / 2),
      max: (canvas.width / 2),
      presetKey: `offsetX-${id}`
    });
    this.gui.addInput(this.params, 'offsetY', {
      min: -(canvas.height / 2),
      max: (canvas.height / 2),
      presetKey: `offsetY-${id}`
    });
    this.gui.addInput(this.params, 'scale', {
      min: 1,
      max: 30,
      presetKey: `scale-${id}`
    });
    this.gui.addInput(this.params, 'rotation', {
      min: -360,
      max: 360,
      presetKey: `rotation-${id}`
    });
  }

  close () {
    this.gui.dispose();
  }
}

function onZoneActivated (zone) {
  console.log(`zone ${zone.id} is ${zone.isMovementDetectedFlag ? 'ON' : 'OFF'}`)
  const state = Number(zone.isMovementDetectedFlag)
}

let vida = null
let pg = null
let appGUI = null
let zonesGUI = null

const trackParams = {
  track: false,
  threshold: 0.2,
  thresholdStep: 0.001,
  thresholdMin: 0.001,
  thresholdMax: 1,
  showCenters: false
}

const onZoneActivatedThrottled = throttle(onZoneActivated, 500)

function setup() {
  createCanvas(windowWidth, windowHeight)

  pg = createGraphics((windowWidth * lidarImageDownsample), (windowHeight * lidarImageDownsample))

  vida = new Vida(this)

  vida.progressiveBackgroundFlag = true
  vida.imageFilterFeedback = 0.96 // probably best to stay between .9 and .98
  vida.imageFilterThreshold = 0.333

  vida.handleActiveZonesFlag = true
  vida.setActiveZonesNormFillThreshold(trackParams.threshold)

  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i]
    vida.addActiveZone(i, z.x, z.y, z.w, z.h, onZoneActivatedThrottled)

    const params = Object.assign({
      xMin: 0,
      xMax: 1,
      xStep: 0.01,
      yMin: 0,
      yMax: 1,
      yStep: 0.01,
      wMin: 0,
      wMax: 1,
      wStep: 0.01,
      hMin: 0,
      hMax: 1,
      hStep: 0.01,
    }, z)

    vida.activeZones[i].params = params
    zgui = createGui('zone-' + i)
    zgui.addObject(vida.activeZones[i].params)
    zgui.setPosition(250 + (i * 50), 20 + (i * 25))

    console.log(vida.activeZones[i])
  }

  appGUI = createGui('track')
  appGUI.addObject(trackParams)
}

const rad = (Math.PI / 180)

function d2r (deg) {
  return deg * rad;
}

function drawPoints () {
  pg.noStroke();
  pg.background(0);
  // pg.fill(255, 255, 255);

  for (const id in lidar) {
    pg.push();
    pg.fill(255, 0, 0);

    pg.translate(
      (canvas.width / 2) + lidar[id].params.offsetX,
      (canvas.height / 2) + lidar[id].params.offsetY
    );
    pg.rotate(d2r(lidar[id].params.rotation));

    for (let i = (lidar[id].data.length - 1); i > 0 ; i--) {
      let { x, y } = lidar[id].data[i];
      x /= lidar[id].params.scale;
      y /= lidar[id].params.scale;

      // console.log(x, y);

      pg.ellipse(x, y, 5, 5);
    }
    pg.pop();
  }
}

function drawCenters () {
  fill(255, 0, 0)
  for (ID in lidar) {
    const d = lidar[id]

    push()
    const offsetX = ((d.params.offsetX * rescaleFactor) + (width * 0.5))
    const offsetY = ((d.params.offsetY * rescaleFactor) + (height * 0.5))
    translate(offsetX, offsetY)
    rotate(d2r(d.params.rotation))
    scale(d.params.scale)
    ellipse(0, 0, 10)
    pop()
  }
}

function keyPressed () {
  if (keyCode === SHIFT) {
  }
}

function draw() {
  background(0);

  drawPoints()

  if (mouseIsPressed) {
    pg.noStroke()
    pg.fill(255, 255, 255)
    const x = mouseX * lidarImageDownsample
    const y = mouseY * lidarImageDownsample
    pg.ellipse(x, y, 25, 25)
  }

  if (trackParams.track) {
    vida.setActiveZonesNormFillThreshold(trackParams.threshold)
    vida.update(pg)
    image(vida.differenceImage, 0, 0, width, height)
  } else {
    image(pg, 0, 0, width, height)
  }

  stroke(255, 0, 0)
  noFill()
  for (let i = 0; i < vida.activeZones.length; i++) {
    if (trackParams.track) {
      const az = vida.activeZones[i]

      az.normX = az.params.x
      az.normY = az.params.y
      az.normW = az.params.w
      az.normH = az.params.h

      const x = az.normX * width
      const y = az.normY * height
      const w = az.normW * width
      const h = az.normH * height

      if (az.isMovementDetectedFlag) {
        fill('rgba(255, 0, 0, 0.2)')
      } else {
        noFill()
      }
      rect(x, y, w, h)
    } else {
      // vida.activeZones[i]
    }
  }

  trackParams.showCenters && drawCenters()

  noStroke()
  fill(0, 255, 0)
  text(`${getFrameRate().toFixed(2)} FPS`, (width - 400), 25)
}
