let devices = {}

const ws = new WebSocket('ws://127.0.0.1:8080')

ws.onmessage = function (event) {
  if (event.data.indexOf('lidar-register') > -1) {
    const ID = event.data.split('/')[1]
    onLidarRegister(ID)
  } else if (event.data.indexOf('server-success') > -1) {
    console.log('server success')
    ws.send('needs-lidar-registration')
  } else {
    try {
      const data = JSON.parse(event.data)
      data && onLidarData(data)
    } catch (ignore) { console.warn(ignore) }
  }
}

const lidarImageDownsample = 0.25

function onLidarRegister (ID) {
  console.log('lidar registered with ID', ID)
  devices[ID] = Object.assign({}, {
    gui: createGui(ID),
    params: {
      offsetX: 0,
      offsetXMin: -(windowWidth * lidarImageDownsample),
      offsetXMax: (windowWidth * lidarImageDownsample),
      offsetY: 0,
      offsetYMin: -(windowHeight * lidarImageDownsample),
      offsetYMax: (windowHeight * lidarImageDownsample),
      scale: 1,
      scaleStep: 0.01,
      scaleMin: 0.01,
      scaleMax: 3,
      angle: 0,
      angleMin: -360,
      angleMax: 360,
      color: [255, 255, 255]
    },
    distances: []
  })

  devices[ID].gui.addObject(devices[ID].params);
}

function onLidarData (data) {
  // console.log(data)
  if (data.quality) {
    devices[data.ID].distances[Math.floor(data.angle)] = data.distance
  }
}

function onZoneActivated (zone) {
  // console.log(`zone ${zone.id} has ${zone.isMovementDetectedFlag ? '' : 'no more'} movement.`)
  const event = {
    type: 'zone-activity',
    zone
  }
  ws.send(JSON.stringify(event))
}

let vida = null
let pg = null

function setup() {
  createCanvas(windowWidth, windowHeight)

  pg = createGraphics((windowWidth * lidarImageDownsample), (windowHeight * lidarImageDownsample))

  vida = new Vida(this)

  vida.progressiveBackgroundFlag = true
  vida.imageFilterFeedback = 0.9 // probably best to stay between .9 and .98
  vida.imageFilterThreshold = 0.2

  vida.handleActiveZonesFlag = true
  vida.setActiveZonesNormFillThreshold(0.02)

  // addActiveZone(identifier, normX, normY, normW, normH, onChangeCallbackFunction)
  vida.addActiveZone(0, 0, 0, 0.2, 1, onZoneActivated)
  vida.addActiveZone(1, 0.8, 0, 0.2, 1, onZoneActivated)
  vida.addActiveZone(2, 0, 0, 1, 0.2, onZoneActivated)

  // vida.handleBlobsFlag = true
  // vida.trackBlobsFlag = true
  // vida.rejectBlobsMethod = vida.REJECT_OUTER_BLOBS
  // vida.approximateBlobPolygonsFlag = true
  // vida.pointsPerApproximatedBlobPolygon = 5
  // vida.normMinBlobArea = 0.0002
  // vida.normMaxBlobArea = 0.5
}

let maxDistance = 5000
const rad = (Math.PI / 180)

function draw() {
  background(0);

  pg.noStroke()
  pg.background(0);
  
  pg.fill(255, 255, 255)
  for (ID in devices) {
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

    fill(255, 0, 0)
    ellipse(0, 0, 5, 5)
    pg.pop()
  }

  vida.update(pg)

  // image(pg, 0, 0, width, height)
  image(vida.differenceImage, 0, 0, width, height)

  stroke(255, 0, 0)
  noFill()
  for (let i = 0; i < vida.activeZones.length; i++) {
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
  }

  // vida.drawBlobs(0, 0, width, height)

  // image(pg, 0, 0, width/2, height/2)
  // image(vida.backgroundImage, width/2, 0, width/2, height/2)
  // image(vida.differenceImage, 0, height/2, width/2, height/2)
  // image(vida.thresholdImage, width/2, height/2, width/2, height/2)
  // vida.drawBlobs(width/2, height/2, width/2, height/2)

  noStroke()
  fill(0, 255, 0)
  text(`${getFrameRate().toFixed(2)} FPS`, (width - 70), 25)
}
