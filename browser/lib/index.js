/*jshint strict:true, browser:true, es5:true, onevar:true, laxcomma:true, laxbreak:true*/
/*
 * BROWSER
 */

(function () {
  "use strict";
  var $ = require('ender')
    , url = require('url')
    , reqwest = require('reqwest')
    , window = require('window')
    , document = window.document
    , io = require('socket.io-browser')
    , pure = require('./pure-inject')
    , tabCtrl = require('./tab-ctrl')
    , serverCtrl = require('./server-ctrl')
    , streamCtrl = require('./stream-ctrl')
    ;

  //EVENT LISTENERS ALL
  $('.container').delegate('.js-open-listener', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = Number($('.js-portNum[data-protocol="'+protocol+'"]').val())
      ;

    serverCtrl.openListener(protocol, port);
  });
  $('.container').delegate('.js-portNum', 'keypress', function (e) {
    if (e.keyCode === 13) {
      serverCtrl.openListener($(this).attr('data-protocol'), Number($(this).val()));
    }
  });

  $('.container').delegate('.js-listener-stream pre', 'click', function () {
    $(this).toggleClass('css-hl-block');
  });
  $('.container').delegate('.js-scroll', 'change', function () {
    streamCtrl.scrollLock($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  $('.container').delegate('.js-clear', 'click', function () {
    streamCtrl.clearStream($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  $('.container').delegate('.js-toggle-log', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).attr('listener-port')
      , curState = $(this).hasClass('activeLog')
      ;

    serverCtrl.setListenerLogging(protocol, port, {logData: !curState});
  });
  $('.container').delegate('.js-separate-packets', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).attr('listener-port')
      , curState = $(this).attr('checked')
      ;

    // for the check boxes the state changes to was the user wants before we get the event
    serverCtrl.setListenerLogging(protocol, port, {separateFiles: curState});
  });
  $('.container').delegate('.js-save-headers', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).attr('listener-port')
      , curState = $(this).attr('checked')
      ;

    // for the check boxes the state changes to was the user wants before we get the event
    serverCtrl.setListenerLogging(protocol, port, {includeHeaders: curState});
  });

  $('.container').delegate('.js-close-listener', 'click', function () {
    serverCtrl.closeListener($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  $('.container').delegate('.js-reopen-listener', 'click', function () {
    serverCtrl.openListener($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  $('.container').delegate('.js-close-listener-tab', 'click', function () {
    tabCtrl.closeListenerTab($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  //SOCKET COMMUNICATION WITH SERVER
  function openSocket(port) {
    var socket = io.connect('http://'+window.location.hostname+':'+port)
      , initialConnect = true
      , reconnect = false
      ;

    socket.on('connect', function () {
      socket.send('hi');

      if (reconnect) {
        // reload information
      }
      else if (!initialConnect) {
        console.error('socket IO connected again without disconnecting');
      }
    });

    socket.on('listenerCreated', function (msg){
      tabCtrl.addListenerTab(msg.protocol, msg.port, msg.logSettings);
    });
    socket.on('listenerChanged', function (msg) {
      tabCtrl.updateListenerSettings(msg.protocol, msg.port, msg.logSettings);
    });

    socket.on('listenerData', function (msg) {
      streamCtrl.preInjectCode(msg);
    });

    //socket.on('connectionChange', function (msg) {
      //console.log('TODO: implement connectionChange:', msg);
      //$('.js-tcp-connection-count').html(count);
    //});

    socket.on('listenerClosed', function (msg) {
      var options = {};

      options.body = msg.protocol.toUpperCase() + ' Listener on port ' + msg.port + ' closed';
      options.cssClass = 'css-streamCloseConnection';
      options.protocol = msg.protocol;
      streamCtrl.injectMessage(options, 'default');
      streamCtrl.injectMessage(options, port);

      tabCtrl.deactivateTab(msg.protocol, msg.port);
    });

    socket.on('disconnect', function () {
      var options = {};

      console.log('Browser-Disconnected socket');
      options.cssClass = 'css-streamError';
      options.body = 'NetBug Server Down';
      options.protocol = 'all';
      streamCtrl.injectMessage(options, 'default');
      options.active = false;
      tabCtrl.deactivateTab('all');

      reconnect = true;
    });
  }

  function initBuild(resp) {
    var hash= url.parse(window.location.hash.substr(2), true, true).pathname
      , validHash = []
      ;

    // substring is to remove leading "#/" so we can process
    // the hash as a pathname to remove anything we can't handle
    if (hash) {
      hash = hash.split('/');
    }
    else {
      hash = [];
    }


    openSocket(resp.result.socketPort);
    // delete the socket port to make sure it isn't interpretted as a protocol
    delete resp.result.socketPort;

    Object.keys(resp.result).forEach(function (protocol) {
      if (Array.isArray(resp.result[protocol])) {
        tabCtrl.addProtocolTab(protocol);
        if (hash[0] === protocol) {
          validHash[0] = protocol;
          if (hash[1] === 'default') {
            validHash[1] = hash[1];
          }
        }
        resp.result[protocol].forEach(function (listener) {
          listener.port = listener.port || listener.portNum;
          tabCtrl.addListenerTab(protocol, listener.port, listener.logSettings);
          if (hash[0] === protocol && hash[1] === listener.port.toString()) {
            validHash[1] = hash[1];
          }
        });
      }
    });

    if (validHash[0]) {
      setTimeout(function () {
        window.location.hash = '#/' + validHash.join('/');
      }, 50);
    }
  }

  $(document).ready(function () {
    var options = {};
    options.protocol = 'all';
    options.body = '';

    pure.compileTemplates();

    reqwest({
      url: 'http://'+window.location.host+'/onPageLoad'
    , type: 'json'
    , method: 'get'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        streamCtrl.injectMessage(options, 'default');
      }
    , success: function (resp) {
        if (!resp.error && resp.result && !resp.result.error) {
          initBuild(resp);
        }
        else {
          options.cssClass = 'css-streamError';
          if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
            options.body += resp.result.error;
          }
          if (Array.isArray(resp.errors)) {
            resp.errors.forEach(function (error) {
              options.body += error.message;
            });
          }
          if (!options.body) {
            options.body = 'Unknown error on page load';
          }
          streamCtrl.injectMessage(options, 'default');
        }
      }
    });
  });

}());
