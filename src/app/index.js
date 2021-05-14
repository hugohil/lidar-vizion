const osc = new OSC()
osc.open()

let devices = {}

osc.on('/lidar/register', message => {
  const serial = message.args[0]
  console.log(`device ${serial} registering.`)
  devices[serial] = Object.assign({
    distances: { current: [], prev: [] }
  }, devices[serial])
  console.log(devices)

  devices[serial].handler = osc.on(`/lidar/scan/${serial}`, message => {
    devices[serial].distances.prev = devices[serial].distances.current || []
    devices[serial].distances.current = message.args
  })
})
/* TODO:
  find a way to safely receive '/scan' messages for non-registered devices
  (do some kind of auto-registering)
*/

osc.on('/lidar/byebye', message => {
  const serial = message.args[0]
  console.log(`bye bye ${serial}`)

  if (devices[serial].handler) {
    osc.off(`/lidar/scan/${serial}`, devices[serial].handler)
  }
})

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

    devices[serial].distances.current.forEach((distance, index) => {
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
