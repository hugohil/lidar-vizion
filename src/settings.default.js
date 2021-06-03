module.exports = {
  oscBridgeConfig: {
    receiver: 'udp',
    udpServer: {
      host: '0.0.0.0',
      port: 41234
    },
    udpClient: {
      host: '0.0.0.0',
      port: 41235
    }
  }
}