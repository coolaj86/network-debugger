(function () {
  "use strict";

  var net = require('net')
    , path = require('path')
    , isUtf8 = require('is-utf8')
    , file = require('./file')
    , listeners = {}
    , browserSocket
    ;

  function assignSocket (socket) {
    browserSocket = socket;
  }

  function printErr(err, port) {
    console.error('TCP port', port, 'server error:', err);
  }

  function currentStatus() {
    var openPorts = Object.keys(listeners)
      ;

    openPorts = openPorts.sort();

    return openPorts.map(function (portNum) {
      return {
          portNum: Number(portNum)
        , connectionCount: listeners[portNum].connections.length
        , logSettings: listeners[portNum].logSettings
      };
    });
  }

  function createTcpListener(callback, port, logPath) {
    var server = net.createServer()
      , connections   = []
      , finishedData  = []
      , logSettings   = {}
      ;

    // wrap the callback so we never accidently call
    // the one we were given more than once
    function callbackWrapper(err) {
      callback(err, port);
      callback = printErr;
    }

    function validateConnList() {
      function countRetrieved(err, count) {
        if (err) {
          return callbackWrapper(err);
        }

        if (connections.length !== count) {
          callbackWrapper('connection counts out of sync: nodejs count:', count, 'netbug count:', connections.length);
        }
      }

      server.getConnections(countRetrieved);
    }

    if (isNaN(port)) {
      callbackWrapper('Specified port must be a number');
      return;
    }

    port = Number(port);
    if (listeners.hasOwnProperty(port)) {
      callbackWrapper("Already listening for TCP on port " + port);
      return;
    }

    function handleConnection(socket) {
      var data = []
        , dataSize = 0
        ;

      connections.push(socket);
      validateConnList();

      browserSocket.emit('connectionChange', {
          protocol: 'tcp'
        , port: port
        , count: connections.length
      });

      socket.on('data', function (chunk) {
        dataSize += chunk.length;
        data.push(chunk);
      });

      socket.on('close', function () {
        var index = connections.indexOf(socket)
          , mergedData = Buffer.concat(data, dataSize)
          , strData
          ;

        if (index < 0) {
          callbackWrapper('got a close event for socket not in connections list');
        }
        else {
          connections.splice(index, 1);
        }
        validateConnList();

        browserSocket.emit('connectionChange', {
            protocol: 'tcp'
          , port: port
          , count: connections.length
        });

        if (isUtf8(mergedData)) {
          strData = mergedData.toString('utf8');
        }
        else {
          strData = mergedData.toString('base64');
        }

        browserSocket.emit('listenerData', {
            protocol: 'tcp'
          , port: port
          , body: strData
        });

        if (logSettings.logData) {
          if (logSettings.separateFiles) {
            file.writeData(logSettings.logPath, mergedData);
          }
          else {
            finishedData.push(mergedData);
          }
        }
      });
    }

    server.on('error', callbackWrapper);
    server.on('connection', handleConnection);

    server.on('close', function () {
      if (finishedData.length > 0) {
        file.writeData(logSettings.logPath, finishedData.join('\r\n\r\n'));
        // fastest way to clear an array is to set length to 0
        finishedData.length = 0;
      }

      browserSocket.emit('listenerClosed', {
          protocol: 'tcp'
        , port: port
      });
      delete listeners[port];
    });

    server.on('listening', function () {
      var error
        ;

      // make sure the port we report is actually the one we are listening on
      error = (port && port !== server.address().port) ? "Listening port doesn't match specified port" : null;
      port  = server.address().port;

      logSettings.logPath = path.resolve(logPath, 'tcp', port.toString());
      logSettings.logData = false;
      logSettings.separateFiles = true;

      // seal logSettings so nothing will be deleted or added (prevent stupid typos)
      Object.seal(logSettings);

      listeners[port] = {};
      listeners[port].server        = server;
      listeners[port].connections   = connections;
      listeners[port].finishedData  = finishedData;
      listeners[port].logSettings   = logSettings;

      // now freeze the listener so the references can't be changed or lost
      Object.freeze(listeners[port]);

      browserSocket.emit('listenerCreated', {
          protocol: 'tcp'
        , port: port
        , logSettings: logSettings
      });

      callbackWrapper(error);
    });

    // backwarde compatibility for node < 0.10
    if (typeof server.getConnections !== 'function') {
      server.getConnections = function (cb) {
        cb(null, server.connections);
      };
    }

    server.listen(port);
  }

  // Change whether or not we should log, and it we should log packets separately
  function changeLogSettings(port, newSettings) {
    var logSettings
      , finishedData
      , unusedKeys = []
      ;

    if (!listeners[port]) {
      return {error: 'No TCP listener on port ' + port};
    }

    logSettings = listeners[port].logSettings;
    finishedData = listeners[port].finishedData;

    Object.keys(newSettings).forEach(function (key) {
      if (logSettings.hasOwnProperty(key) && key !== 'logPath') {
        logSettings[key] = newSettings[key];
      }
      else {
        unusedKeys.push(key);
      }
    });

    if (logSettings.logData) {
      file.mkdir(logSettings.logPath);
    }
    if (finishedData.length > 0 && (!logSettings.logData || logSettings.separateFiles)) {
      file.writeData(logSettings.logPath, finishedData.join('\r\n\r\n'));
      // fastest way to clear an array is to set length to 0
      finishedData.length = 0;
    }

    browserSocket.emit('listenerChanged', {
        protocol: 'tcp'
      , port: port
      , logSettings: logSettings
    });

    return {
        logSettings: logSettings
      , unusedKeys: unusedKeys
    };
  }

  //When user requests to close the connection
  function closeTcpListener(callback, port) {
    var timeoutId
      , error
      ;

    if (!listeners[port]) {
      callback('No TCP listener on specified port ' + port);
      return;
    }

    // give all of the connections 2 seconds to finish themselves before we destroy them
    timeoutId = setTimeout(function () {
      if (!listeners[port]) {
        console.error('timeout not cleared even though server is closed');
        return;
      }

      var connections = listeners[port].connections
        ;
      timeoutId = null;
      if (connections.length <= 0) {
        error = 'timeout not cleared even though no connections open';
        printErr(error, port);
        return;
      }

      error = 'forced to destroy remaining ' + connections.length + ' connection(s)';
      printErr(error, port);
      connections.forEach(function (socket) {
        socket.destroy();
      });
    }, 2000);

    // this was originally server.close(cb), but the cb was never called
    listeners[port].server.once('close', function () {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      callback(error);
    });
    listeners[port].server.close();
  }

  module.exports.assignSocket       = assignSocket;
  module.exports.currentStatus      = currentStatus;
  module.exports.createListener     = createTcpListener;
  module.exports.changeLogSettings  = changeLogSettings;
  module.exports.closeListener      = closeTcpListener;

}());
