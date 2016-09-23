Driver service endpoint
=======================

Responsibilities
----------------

1. An endpoint for driver websocket connections
2. Authenticate drivers through backend-api
3. Communication intermediary for driver devices and backend

Installation
------------

#### Key Dependencies

* Kalo-backend-API - https://github.com/kalo-realtime/backend-api
* ZMQ - http://zeromq.org
* Node - https://nodejs.org/en/download

#### Build Steps

1.&nbsp;Clone the library.

```
  git clone git@github.com:kalo-realtime/driver-service.git
```

2.&nbsp;Install dependencies.
```
  cd driver-service/
  npm install
```
3.&nbsp;Configure backend API key and other configurations in config/default.json.

4.&nbsp;Make sure the backend API is running and no other service is running on defined ports for zmq sockets.

5.&nbsp;Start the server

```
  npm start
```

TODO
----

* Test suite
