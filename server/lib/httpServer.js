/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var connect = require('steve')
    , app = connect.createServer()
    , serverHttp
    , currentHttpPort
    , browserSocket
    , isLoggingHttp = false
    , httpBuffer = ''
    , includeHeaders = false
    , file = require('./file')
    ;
  
  function startListening(request, response){
    var connectObj = connect.createServer()
      .use(getBody)
      .use(readHttp);
    serverHttp = connectObj.listen(request.params.portNum);
    currentHttpPort = request.params.portNum;
    serverHttp.on('close', function() {
      console.log('HTTP server closed');
      browserSocket.emit('closedConnection', request.params.portNum, 'http');
    });
    response.end();
  }

  function getBody(req, res, next) {
    var data = ''
      ;
    req.on('data', function (chunk) {
      data += chunk.toString('utf8');
    });
    req.on('end', function() {
      req.rawBody = data;
      next();
    });
  }

  function readHttp (req, res){
    var data = ''
      ;
    data += req.method.toUpperCase() + ' ' + req.url + ' ' + 'HTTP/' + req.httpVersion + '\r\n';
    Object.keys(req.headers).forEach(function (key) {
      data += key + ': ' + req.headers[key] + '\r\n';
    });
    data += '\r\n';

    browserSocket.emit('httpData', {
        "headers": data
      , "body": req.rawBody
      , "protocol": 'http'
    });
    if(isLoggingHttp){
      if(includeHeaders) {
        httpBuffer += (data + req.rawBody + '\r\n\r\n');
      }
      else{
        httpBuffer += (req.rawBody + '\r\n\r\n');
      }
      browserSocket.emit('seperateFiles', 'http');
    }
    res.end('Hello from Connect!\n');
  }

  function writeFile(logpath){
    file.writeFile('http', httpBuffer, currentHttpPort, logpath, function(){httpBuffer = '';});
  }

  function toggleLog(logpath) {
    if(!isLoggingHttp){
      isLoggingHttp = true;
      console.log('logging http Start');
      file.mkdir('http', currentHttpPort, logpath);
    }
    else{
      isLoggingHttp = false;
      if(httpBuffer){
        //write the file
        writeFile(logpath);
      }
    }
  }

  function close(){
    serverHttp.close();
  }
    
  function headers(bool){
    includeHeaders = bool;
  }

  function assignSocket (socket) {
    browserSocket = socket;
  }

  module.exports.toggleLog = toggleLog;
  module.exports.writeFile = writeFile;
  module.exports.close = close;
  module.exports.headers = headers;
  module.exports.assignSocket = assignSocket;
  module.exports.startListening = startListening;
  
}());
