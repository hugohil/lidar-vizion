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
  devices[serial] = Object.assign({
    distances: []
  }, devices[serial], {})
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
  background(120);
  noStroke()

  for (serial in devices) {
    let x, y = 0

    fill(255, 255, 255)

    devices[serial].distances.forEach((distance, index) => {
      maxDistance = Math.max(distance, maxDistance)

      radians = (index * rad)
      x = (distance * cos(radians))
      x = ((width * 0.5) + (x / maxDistance * height * 0.5))
      // x = map(Math.abs(x), 0, maxDistance, 0, width) + (width * .5)
      
      y = (distance * sin(radians))
      y = ((height * 0.5) + (y / maxDistance * height * 0.5))
      // y = map(Math.abs(y), 0, maxDistance, 0, height) + (height * .5)

      ellipse(x, y, 5, 5)
    })
    fill(255, 0, 0)
    ellipse((width * 0.5), (height * 0.5), 5, 5)
  }
}
