let devices = {}

const ws = new WebSocket('ws://127.0.0.1:8080')

ws.onmessage = function (event) {
  if (event.data.indexOf('lidar-register') > -1) {
    const serial = event.data.split('/')[1]
    onLidarRegister(serial)
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

function onLidarRegister (serial) {
  console.log('lidar registered with serial', serial)
  devices[serial] = Object.assign({}, {
    gui: createGui(serial),
    params: {
      offsetX: 0,
      offsetXMin: -(windowWidth * .5),
      offsetXMax: (windowWidth * .5),
      offsetY: 0,
      offsetYMin: -(windowHeight * .5),
      offsetYMax: (windowHeight * .5),
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

  devices[serial].gui.addObject(devices[serial].params);
}

function onLidarData (data) {
  // console.log(data)
  if (data.quality) {
    devices[data.serial].distances[Math.floor(data.angle)] = data.distance
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
}

let maxDistance = 5000
const rad = (Math.PI / 180)

function draw() {
  noStroke()
  background(0);
  
  fill(255, 255, 255)
  for (serial in devices) {
    let x, y = 0

    const d = devices[serial]

    push()
    fill(d.params.color)
    const offsetX = (d.params.offsetX + (width * 0.5))
    const offsetY = (d.params.offsetY + (height * 0.5))
    translate(offsetX, offsetY)
    rotate(d.params.angle * rad)
    scale(d.params.scale)
    
    d.distances.forEach((distance, index) => {
      radians = (index * rad)
      maxDistance = Math.max(distance, maxDistance)

      x = (distance * cos(radians))
      x = map(x, 0, maxDistance, 0, width)

      y = (distance * sin(radians))
      y = map(y, 0, maxDistance, 0, height)

      ellipse(x, y, 5, 5)
    })

    fill(255, 0, 0)
    ellipse(0, 0, 5, 5)
    pop()
  }
}
