var http = require('http')
  , WebSocketServer = require('ws').Server
  , express = require('express')
  , util = require('util')
  , app = express()
  , config = require('config')
  , sockets = require('./driver-zmq.js')
  , client = require('restler');

//start server
var serverConfig = config.get('server');
var server = http.createServer(app);
server.listen(serverConfig.port);
 
var connections = {}
  , connectionCounter = {};
var pub_socket = sockets.pub_socket
  , router_socket = sockets.router_socket;

// setup websocket
var wss = new WebSocketServer({ server: server });

// driver REST API details
var restConfig = config.get('driver-api');
var restOpts = {username: restConfig.api_key, password: ''};
var apiUrl = util.format('http://%s:%s/drivers/auth/', restConfig.host, restConfig.port);

wss.on('connection', function connection(ws) {

  var query = require('url').parse('http://abc.com' + ws.upgradeReq.url, true).query;

  var errorHandler = function(msg){
    return function(data, response){
      try{
        ws.send( JSON.stringify({error: msg}) );
        console.log(msg + ' Error:' + data);
        ws.close();
      }catch(e){
        console.log(e);
      }
      return;
    }
  }

  //console.log('Auth token ' + JSON.stringify(query) );
  if (!(query && query.auth_token)){
    ws.send('{"error":"Authentication token not provided"}');
    ws.close();
    return;
  }


  // authenticate with driver backend
  client.get(apiUrl + query.auth_token, restOpts)
  .on('2XX', function(driver){

      console.log('websocket authenticating ...' + driver.hash_key);

      if (!driver.hash_key){
        ws.send('{"error":"Server error"}');
        console.log('Server error');
        ws.close();
        return;
      }

      // connection already exists for the driver
      if (driver.hash_key in connections){
        try {
          console.log('Driver already connected. Closing old connection.');
          connections[driver.hash_key].close();
        } catch (ex) {
          console.log(ex);
        }
      }

      //authenticate
      ws.driver = driver.hash_key;
      ws.topic = 'gps_' + driver.hash_key;
      ws.authenticated = true;
      connectionCounter[ws.driver] = connectionCounter[ws.driver] || 0;
      connectionCounter[ws.driver] += 1;
      ws.count = connectionCounter[ws.driver];
      connections[ws.driver] = ws;

      ws.on('message', function incoming(message) {
        if (!ws.authenticated){
          ws.close();
          return;
        }

        console.log('received: %s', message);
        pub_socket.send([ws.topic, message]);
      });

      ws.on('close', function() {
        console.log('My count: ' + ws.count + ' global: ' + connectionCounter[ws.driver]);
        if (ws.driver && connectionCounter[ws.driver] && connectionCounter[ws.driver] == ws.count){
          delete connections[ws.driver];
          ws.authenticated = false;
          pub_socket.send(['event_drop_driver', JSON.stringify({'driver_id': ws.driver}) ]);
          console.log('Driver disconnected. ID: ' + driver.hash_key + ' Time: ' + new Date().toISOString());
        }
      });

      /*
      ws.on('ping', function(data, flags){
        if (ws.authenticated == true){
          try {
            ws.pong(data);
          } catch (ex) {
            console.log(ex);
          }
        }
      });
     */

      // fire the event for driver connection
      var msg = {'node': serverConfig.id, 'driver_id': ws.driver};
      pub_socket.send(['event_new_driver', JSON.stringify(msg) ]);

      console.log('Driver connected. ID: ' + driver.hash_key + ' Time: ' + new Date().toISOString() + 
                  ' counter: ' + connectionCounter[ws.driver]);
  })
  .on('4XX', errorHandler('Authentication failed'))
  .on('5XX', errorHandler('Server error'))
  .on('error', errorHandler('Error'));

});

/* listen to commands from driver backend and pings drivers */
router_socket.on('message', function(envelope, event, resourceId, msgId, data) {
  console.log('Router received ' +  event + ' ' + resourceId + ' ' + msgId + ' ' + data);
  //console.log('Connections: ' + Object.keys(connections) );

  /* handler zmq responses */
  var zmqResponse = function(res){
    router_socket.send([envelope].concat(res));
    console.log('Router response: '  + res);
  }

  if (event == 'driver' || event == 'allDrivers'){
    //response format expeted for the driver event
    //[event, id, status code, message]
    res = [event, msgId];

    try{
      if (resourceId in connections){
        connections[resourceId].send(data.toString());
        zmqResponse(res.concat([200, 'Success']));
      }else{
        throw 'Not found';
      }

    }catch(e){
      zmqResponse(res.concat([410, 'Connection broken:' + e + ':' + e.stack]));
    }

  }else{
    zmqResponse(res.concat([422, 'Error with message format']));
  }

});

module.exports = app;
