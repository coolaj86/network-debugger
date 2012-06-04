/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var connect = require('steve')
    , app = connect.createServer()
    , tcpServer = require('./tcpServer')
    , httpServer = require('./httpServer')
    , udpServer = require('./udpServer')
    , file = require('./file')
    , util = require('util')
    , browserSocket
    , Socket = require('socket.io')
    , io = Socket.listen(3454)
    ;

  connect.router = require('connect_router');

  io.set('log level', 1);

  function create (logpath) {
    openSockets();
    //function when a GET request is sent to /listenUDP
    function listenUdp(request, response) {
      udpServer.startListening(request, response);
    }

    //function when a GET request is sent to /listenHTTP
    function listenHttp(request, response) {
      httpServer.startListening(request, response);
    }

    //function when a GET request is sent to /listenTCP
    function listenTcp(request, response) {
      tcpServer.startListening(request, response);
    }

    function onPageLoad(request, response){
      response.json({
        "http": httpServer.currentStatus()
      , "tcp": tcpServer.currentStatus()
      , "udp": udpServer.currentStatus()
      });
      response.end();
    }
    
    //Browser Comm Sockets
    function openSockets() {
      io.sockets.on('connection', function (socket) {
        browserSocket = socket;
        console.log('Connected to browser');
        udpServer.assignSocket(socket);
        tcpServer.assignSocket(socket);
        httpServer.assignSocket(socket);
        socket.on('message', function (data) {
        });
        socket.on('disconnect', function () { 
          console.log('Browser disconnected');
        });
        socket.on('killtcp', function () {
          tcpServer.closeAllSockets();
        });
        socket.on('killhttp', function () {
          httpServer.close();
        });
        socket.on('killudp', function () {
          udpServer.close();
        });
        socket.on('writeFile', function (protocol) { 
          if (protocol === 'tcp'){
            tcpServer.writeFile(logpath);
          }
          else if (protocol === 'http'){
            httpServer.writeFile(logpath);
          }
          else if (protocol === 'udp'){
            udpServer.writeFile(logpath);
          }
        });
        socket.on('close', function () { 
          console.log('ClOsEd Socket');
        });
        socket.on('includeHeaders', function (bool) { 
          httpServer.headers(bool);
        });
        socket.on('logtcp', function() {
          tcpServer.toggleLog(logpath);
        });
        socket.on('loghttp', function() {
          httpServer.toggleLog(logpath);
        });
        socket.on('logudp', function() {
          udpServer.toggleLog(logpath);
        });
      });
    } 

    function router(rest) {
      rest.get('/listentcp/:portNum', listenTcp);
      rest.get('/listenhttp/:portNum', listenHttp);
      rest.get('/listenudp/:portNum', listenUdp);
      rest.get('/onPageLoad', onPageLoad);
    }

    app.use(connect.favicon());
    app.use(connect.static(__dirname + '/../../webclient-deployed'));
    app.use(connect.router(router));
    
    return app;
  }
    module.exports.create = create;
}());

