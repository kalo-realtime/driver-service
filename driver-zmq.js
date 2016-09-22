// zmq setup
var config = require('config')
  , zmq      = require('zmq')
  , pub_socket  = zmq.socket('pub')
  , router_socket= zmq.socket('router');

var zmqConfig = config.get('zmq');
console.log("ZMQ " + zmqConfig.publish_port);

// publisher publishes gps cordinates from the driver
pub_socket.bindSync('tcp://' + zmqConfig.host + ':' + zmqConfig.publish_port);
console.log('Publisher bound to port ' + zmqConfig.publish_port);

// bind router to receive notifications to Driver
router_socket.bind('tcp://' + zmqConfig.host + ':' + zmqConfig.router_port, function(err) {
  if (err) throw err;
  console.log('Router bound to ' + zmqConfig.router_port);
});

module.exports = {pub_socket: pub_socket, router_socket: router_socket};
