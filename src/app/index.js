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

const osc = new OSC()

osc.on('/lidar', (message, rinfo) => {
  const ID = message.args[0]

  if (!devices[ID]) {
    onLidarRegister(ID)
  }
  onLidarData(message)
})

const lidarImageDownsample = 0.5
const rescaleFactor = (1 / lidarImageDownsample)

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
  const ID = data.args.shift()
  for (let i = 1; i < data.args.length; i += 2) {
    const angle = data.args[i]
    devices[ID].distances[Math.floor(angle)] = [data.args[(i - 1)], angle]
  }
}

function onZoneActivated (zone) {
  // console.log(`zone ${zone.id} has ${zone.isMovementDetectedFlag ? '' : 'no more'} movement.`)
  const event = {
    type: 'zone-activity',
    zone
  }
  // console.log(event)
  osc.send(new OSC.Message('/zone-activity', zone.id))
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

const onZoneActivatedThrottled = throttle(onZoneActivated, 2000)

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
    zgui.setPosition(20, (i * 50))

    console.log(vida.activeZones[i])
  }

  appGUI = createGui('track')
  appGUI.addObject(trackParams)

  osc.open()
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
    
    d.distances.forEach(([distance, angle], index) => {
      radians = (angle * rad)
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
    const offsetX = ((d.params.offsetX * rescaleFactor) + (width * 0.5))
    const offsetY = ((d.params.offsetY * rescaleFactor) + (height * 0.5))
    translate(offsetX, offsetY)
    rotate(d.params.angle * rad)
    scale(d.params.scale)
    ellipse(0, 0, 10)
    pop()
  }
}

function keyPressed () {
  if (keyCode === SHIFT) {
    osc.send(new OSC.Message('/vizion-ok'))
  }
}

function draw() {
  background(0);

  drawPoints()

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
  text(`${getFrameRate().toFixed(2)} FPS`, (width - 70), 25)
}
