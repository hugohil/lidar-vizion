const devices = {}

const osc = new OSC()
osc.open()

osc.on('/lidar', (message, rinfo) => {
  const ID = message.args[0]

  if (!devices[ID]) {
    onLidarRegister(ID)
  }
  onLidarData(message)
})

const lidarImageDownsample = 0.25

function onLidarRegister (ID) {
  let memory = localStorage.getItem(ID)
  if (memory) {
    memory = JSON.parse(memory)
  }

  console.log('lidar registered with ID', ID)
  devices[ID] = Object.assign({}, {
    gui: createGui(ID),
    params: {
      offsetX: memory ? memory.offsetX : 0,
      offsetXMin: -(windowWidth * lidarImageDownsample),
      offsetXMax: (windowWidth * lidarImageDownsample),
      offsetY: memory ? memory.offsetY : 0,
      offsetYMin: -(windowHeight * lidarImageDownsample),
      offsetYMax: (windowHeight * lidarImageDownsample),
      scale: memory ? memory.scale : 1,
      scaleStep: 0.01,
      scaleMin: 0.01,
      scaleMax: 3,
      angle: memory ? memory.angle : 0,
      angleMin: -360,
      angleMax: 360,
      color: [255, 255, 255]
    },
    distances: new Array(360)
  })

  devices[ID].gui.addObject(devices[ID].params)
  devices[ID].gui.addButton('save', () => {
    localStorage.setItem(ID, JSON.stringify({
      offsetX: devices[ID].params.offsetX,
      offsetY: devices[ID].params.offsetY,
      scale: devices[ID].params.scale,
      angle: devices[ID].params.angle
    }))
  })

  const guiOffset = 111 * (Object.keys(devices).length + 1)
  devices[ID].gui.setPosition(guiOffset, 20)
}

function onLidarData (data) {
  const [ID, distance, angle] = data.args
  devices[ID].distances[Math.floor(angle)] = distance
}

function onZoneActivated (zone) {
  // console.log(`zone ${zone.id} has ${zone.isMovementDetectedFlag ? '' : 'no more'} movement.`)
  const event = {
    type: 'zone-activity',
    zone
  }
  console.log(event)
  osc.send(new OSC.Message(`/zone-activity/${zone.id}`))
}

let vida = null
let pg = null
let appGUI = null

const trackParams = {
  track: true,
  threshold: 0.2,
  thresholdStep: 0.001,
  thresholdMin: 0.001,
  thresholdMax: 1,
  showCenters: false
}

function setup() {
  createCanvas(windowWidth, windowHeight)

  pg = createGraphics((windowWidth * lidarImageDownsample), (windowHeight * lidarImageDownsample))

  vida = new Vida(this)

  vida.progressiveBackgroundFlag = true
  vida.imageFilterFeedback = 0.96 // probably best to stay between .9 and .98
  vida.imageFilterThreshold = 0.333

  vida.handleActiveZonesFlag = true
  vida.setActiveZonesNormFillThreshold(trackParams.threshold)

  vida.addActiveZone(0, 0, 0, 0.2, 1, onZoneActivated)
  vida.addActiveZone(1, 0.8, 0, 0.2, 1, onZoneActivated)
  vida.addActiveZone(2, 0, 0, 1, 0.2, onZoneActivated)

  appGUI = createGui('track')
  appGUI.addObject(trackParams)

  frameRate(30);
}

let maxDistance = 5000
const rad = (Math.PI / 180)

function drawPoints () {
  pg.noStroke()
  pg.background(0);
  
  pg.fill(255, 255, 255)
  for (ID in devices) {
    let x, y = 0

    const d = devices[ID]

    pg.push()
    pg.fill(d.params.color)
    const offsetX = (d.params.offsetX + (pg.width * 0.5))
    const offsetY = (d.params.offsetY + (pg.height * 0.5))
    pg.translate(offsetX, offsetY)
    pg.rotate(d.params.angle * rad)
    pg.scale(d.params.scale)
    
    d.distances.forEach((distance, index) => {
      radians = (index * rad)
      maxDistance = Math.max(distance, maxDistance)

      x = (distance * cos(radians))
      x = map(x, 0, maxDistance, 0, pg.width)

      y = (distance * sin(radians))
      y = map(y, 0, maxDistance, 0, pg.height)

      pg.ellipse(x, y, 2, 2)
    })
    pg.pop()
  }
}

function drawCenters () {
  fill(255, 0, 0)
  for (ID in devices) {
    const d = devices[ID]

    push()
    const offsetX = (d.params.offsetX + (width * 0.5))
    const offsetY = (d.params.offsetY + (height * 0.5))
    translate(offsetX, offsetY)
    ellipse(0, 0, 10)
    pop()
  }
}

function draw() {
  background(0);

  drawPoints()
  trackParams.showCenters && drawCenters()

  if (trackParams.track) {
    vida.setActiveZonesNormFillThreshold(trackParams.threshold)
    trackParams.track && vida.update(pg)
    image(vida.differenceImage, 0, 0, width, height)
  } else {
    image(pg, 0, 0, width, height)
  }

  stroke(255, 0, 0)
  noFill()
  for (let i = 0; i < vida.activeZones.length; i++) {
    if (trackParams.track) {
      const az = vida.activeZones[i]
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

  noStroke()
  fill(0, 255, 0)
  text(`${getFrameRate().toFixed(2)} FPS`, (width - 70), 25)
}
