/*jshint strict:true, browser:true, es5:true, onevar:true, laxcomma:true, laxbreak:true*/
/*
 * BROWSER
 */

(function () {
  "use strict";
  var $ = require('ender')
    , url = require('url')
    , location = require('window').location
    , io = require('socket.io-browser')
    , pure = require('./pure-inject')
    , tabCtrl = require('./tab-ctrl')
    , serverCtrl = require('./server-ctrl')
    , streamCtrl = require('./stream-ctrl')
    , socketConnected = false
    ;

  //EVENT LISTENERS ALL

  // tab navigation
  $('body').delegate('.js-tab', 'click', function () {
    tabCtrl.displayTab($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  // event interceptor
  $('.container').on('click keypress', function (event) {
    if (socketConnected) {
      return;
    }
    if ($(event.target).hasClass('js-always-works')) {
      return;
    }
    event.stopImmediatePropagation();
  });

  // listener control
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

  // stream visualization control
  $('.container').delegate('.js-listener-stream pre', 'click', function () {
    $(this).toggleClass('css-hl-block');
  });
  $('.container').delegate('.js-scroll-lock', 'change', function () {
    streamCtrl.scrollLock($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  $('.container').delegate('.js-clear-stream', 'click', function () {
    streamCtrl.clearStream($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  function reloadListeners(resp) {
    Object.keys(resp.result).forEach(function (protocol) {
      if (Array.isArray(resp.result[protocol])) {
        resp.result[protocol].forEach(function (listener) {
          listener.port = listener.port || listener.portNum;
          tabCtrl.addListenerTab(protocol, listener.port, listener.logSettings);
        });
      }
    });
  }

  //SOCKET COMMUNICATION WITH SERVER
  function openSocket(port) {
    var socket = io.connect('http://'+location.hostname+':'+port)
      , initialConnect = true
      ;

    socket.on('connect', function () {
      var options = {};
      socket.send('hi');

      if (socketConnected) {
        console.error('socket IO connected again without disconnecting');
      }
      else if (!initialConnect) {
        options.cssClass = 'css-stream-message';
        options.body = 'Reconnected to server';
        streamCtrl.injectMessage('all', 'all', options);

        $('.js-open-listener').removeClass('disabled');
        $('.js-reopen-listener').removeClass('disabled');
        serverCtrl.getAllListeners(reloadListeners);
      }

      socketConnected = true;
      initialConnect = false;
    });

    socket.on('listenerCreated', function (msg){
      tabCtrl.addListenerTab(msg.protocol, msg.port, msg.logSettings);
    });
    socket.on('listenerChanged', function (msg) {
      tabCtrl.updateListenerSettings(msg.protocol, msg.port, msg.logSettings);
    });

    socket.on('listenerData', function (msg) {
      streamCtrl.injectCode(msg.protocol, msg.port, msg);
    });

    //socket.on('connectionChange', function (msg) {
      //console.log('TODO: implement connectionChange:', msg);
      //$('.js-tcp-connection-count').html(count);
    //});

    socket.on('listenerClosed', function (msg) {
      var options = {};

      options.body = msg.protocol.toUpperCase() + ' listener on port ' + msg.port + ' closed';
      options.cssClass = 'css-streamCloseConnection';
      streamCtrl.injectMessage(msg.protocol, 'default', options);
      streamCtrl.injectMessage(msg.protocol, msg.port, options);

      tabCtrl.deactivateTab(msg.protocol, msg.port);
    });

    socket.on('disconnect', function () {
      var options = {};

      socketConnected = false;

      options.cssClass = 'css-streamError';
      options.body = 'Lost connection to the server';
      streamCtrl.injectMessage('all', 'all', options);
      tabCtrl.deactivateTab('all');

      $('.js-open-listener').addClass('disabled');
      $('.js-reopen-listener').addClass('disabled');
    });
  }

  function initBuild(resp) {
    // substring is to remove leading "#/" so we can process
    // the hash as a pathname to remove anything we can't handle
    var hash= url.parse(location.hash.substr(2), true, true).pathname
      , validHash = []
      ;

    if (hash) {
      hash = hash.split('/');
    }
    else {
      hash = [];
    }

    openSocket(resp.result.socketPort);

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

    if (validHash.length === hash.length) {
      setTimeout(function () {
        tabCtrl.displayTab.apply(tabCtrl, validHash);
      }, 50);
    }
  }

  $.domReady(function () {
    pure.compileTemplates();
    serverCtrl.getAllListeners(initBuild);
  });

}());
