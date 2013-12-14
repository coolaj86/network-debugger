(function () {
  "use strict";

  var http = require('http')
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
    console.error('HTTP port', port, 'server error:', err);
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

  function restringifyHeaders(req) {
    var headers = ''
      ;

    headers += req.method.toUpperCase() + ' ' + req.url + ' ' + 'HTTP/' + req.httpVersion + '\r\n';
    Object.keys(req.headers).forEach(function (key) {
      headers += key + ': ' + req.headers[key] + '\r\n';
    });
    headers += '\r\n';

    return headers;
  }

  function createHttpListener(callback, port, logPath) {
    var server = http.createServer()
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
      callbackWrapper('Already listening for HTTP on port ' + port);
      return;
    }

    server.on('error', callbackWrapper);

    server.on('connection', function (socket) {
      connections.push(socket);
      validateConnList();

      browserSocket.emit('connectionChange', {
          protocol: 'http'
        , port: port
        , count: connections.length
      });

      socket.on('close', function () {
        var index = connections.indexOf(socket);

        if (index < 0) {
          callbackWrapper('got a close event for socket not in connections list');
        }
        else {
          connections.splice(index, 1);
        }
        validateConnList();

        browserSocket.emit('connectionChange', {
            protocol: 'http'
          , port: port
          , count: connections.length
        });
      });
    });

    server.on('request', function (request, response) {
      var body = []
        , bodySize = 0
        ;

      request.on('data', function (chunk) {
        bodySize += chunk.length;
        body.push(chunk);
      });

      request.on('end', function () {
        var headers = restringifyHeaders(request)
          , mergedBody = Buffer.concat(body, bodySize)
          , strBody
          , loggableData
          ;

        response.end('Hello from Netbug');

        if (isUtf8(mergedBody)) {
          strBody = mergedBody.toString('utf8');
        }
        else {
          strBody = mergedBody.toString('base64');
        }

        browserSocket.emit('listenerData', {
            protocol: 'http'
          , port: port
          , headers: headers
          , body: strBody
        });

        if (logSettings.logData) {
          if (logSettings.includeHeaders) {
            loggableData = Buffer.concat([new Buffer(headers), mergedBody], headers.length + bodySize);
          }
          else {
            loggableData = mergedBody;
          }

          if (logSettings.separateFiles) {
            file.writeData(logSettings.logPath, loggableData);
          }
          else {
            finishedData.push(loggableData);
          }
        }
      });
    });

    server.on('close', function () {
      if (finishedData.length > 0) {
        file.writeData(logSettings.logPath, finishedData.join('\r\n\r\n'));
        // fastest way to clear an array is to set length to 0
        finishedData.length = 0;
      }

      browserSocket.emit('listenerClosed', {
          protocol: 'http'
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

      logSettings.logPath = path.resolve(logPath, 'http', port.toString());
      logSettings.logData = false;
      logSettings.separateFiles   = true;
      logSettings.includeHeaders  = false;

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
          protocol: 'http'
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
      return {error: 'No HTTP listener on port ' + port};
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
        protocol: 'http'
      , port: port
      , logSettings: logSettings
    });

    return {
        logSettings: logSettings
      , unusedKeys: unusedKeys
    };
  }

  //When user requests to close the connection
  function closeHttpListener(callback, port) {
    var timeoutId
      , error
      ;

    if (!listeners[port]) {
      callback('No HTTP listener on specified port ' + port);
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
  module.exports.createListener     = createHttpListener;
  module.exports.changeLogSettings  = changeLogSettings;
  module.exports.closeListener      = closeHttpListener;

}());
