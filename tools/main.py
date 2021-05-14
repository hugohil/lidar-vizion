import os
import time
import argparse
from math import floor
from adafruit_rplidar import RPLidar
from pythonosc import udp_client

parser = argparse.ArgumentParser()
parser.add_argument('--ip', default='127.0.0.1', help='The ip of the OSC server')
parser.add_argument('--port', type=int, default=41234, help='The port the OSC server is listening on')
args = parser.parse_args()
client = udp_client.SimpleUDPClient(args.ip, args.port)

# Setup the RPLidar
PORT_NAME = '/dev/tty.SLAB_USBtoUART'
lidar = RPLidar(None, PORT_NAME, timeout=3)

scan_data = [0]*360

try:
  print(lidar.info)
  client.send_message('/lidar/register', lidar.info['serialnumber'])
  address = '/lidar/scan/' + lidar.info['serialnumber']
  for scan in lidar.iter_scans():
    for (_, angle, distance) in scan:
      scan_data[min([359, floor(angle)])] = distance
    print(scan_data)
    client.send_message(address, scan_data)

except KeyboardInterrupt:
  print('Stopping...')
  lidar.stop()
  time.sleep(1)

  client.send_message('/lidar/byebye', lidar.info['serialnumber'])
  time.sleep(1)

  lidar.disconnect()