(function () {
  "use strict";
  var domready = require('domready')
    , qwery = require('qwery')
    , bonzo = require('bonzo')
    , bean = require('bean')
    , url = require('url')
    , window = require('window')
    , location = window.location
    , io = require('socket.io-browser')
    , pure = require('./pure-inject')
    , tabCtrl = require('./tab-ctrl')
    , serverCtrl = require('./server-ctrl')
    , streamCtrl = require('./stream-ctrl')
    , socketConnected = false
    , container
    ;

  function $(selector) {
    return bonzo(qwery(selector));
  }

  bean.setSelectorEngine(qwery);
  //EVENT LISTENERS ALL
  //window sizing
  bean.on(window, 'resize', function () {
    var current = $('body').dim().height
      , target = window.innerHeight - 50
      , streamSize = 0
      ;

    // the streams should all be the same height, but it case
    // they aren't find the biggest, assume they are all the same,
    // and then make them all the same.
    qwery('.css-stream').forEach(function (stream) {
      if (bonzo(stream).dim().height > streamSize) {
        streamSize = bonzo(stream).dim().height;
      }
    });

    $('.css-stream').css('height', streamSize + (target-current));
  });

  // tab navigation
  bean.on(qwery('body')[0], 'click', '.js-tab', function () {
    tabCtrl.displayTab($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  container = qwery('.container')[0];
  // event interceptor
  bean.on(container, 'click keypress', function (event) {
    if ($(event.target).hasClass('js-always-works')) {
      return;
    }
    if (socketConnected && !$(event.target).hasClass('disabled')) {
      return;
    }
    event.stopImmediatePropagation();
  });

  // listener control
  bean.on(container, 'click', '.js-open-listener', function () {
    var protocol = $(this).attr('data-protocol')
      , port = Number($('.js-portNum[data-protocol="'+protocol+'"]').val())
      ;

    serverCtrl.openListener(protocol, port);
  });
  bean.on(container, 'keypress', '.js-portNum', function (e) {
    if (e.keyCode === 13) {
      serverCtrl.openListener($(this).attr('data-protocol'), Number($(this).val()));
    }
  });

  bean.on(container, 'click', '.js-log-ctrl', function () {
    var settings = {}
      ;

    settings[$(this).attr('variable')] = !$(this).attr('checked');
    serverCtrl.setListenerLogging($(this).attr('data-protocol'), $(this).attr('listener-port'), settings);
  });

  bean.on(container, 'click', '.js-close-listener', function () {
    serverCtrl.closeListener($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  bean.on(container, 'click', '.js-reopen-listener', function () {
    serverCtrl.openListener($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  bean.on(container, 'click', '.js-close-listener-tab', function () {
    tabCtrl.closeListenerTab($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  // stream visualization control
  bean.on(container, 'click', '.js-listener-stream pre', function () {
    $(this).toggleClass('css-hl-block');
  });
  bean.on(container, 'change', '.js-scroll-lock', function () {
    streamCtrl.scrollLock($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  bean.on(container, 'click', '.js-clear-stream', function () {
    streamCtrl.clearStream($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  function reloadListeners(resp) {
    // substring is to remove leading "#/" so we can process
    // the hash as a pathname to remove anything we can't handle
    var hash= url.parse(location.hash.substr(2), true, true).pathname
      ;

    if (hash) {
      hash = hash.split('/');
    }
    else {
      hash = [];
    }

    setTimeout(function () {
      tabCtrl.displayTab.apply(tabCtrl, hash);
    }, 25);

    Object.keys(resp).forEach(function (protocol) {
      if (Array.isArray(resp[protocol])) {
        resp[protocol].forEach(function (listener) {
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
      tabCtrl.deactivateTab('all', 'all');

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

    openSocket(resp.socketPort);

    Object.keys(resp).forEach(function (protocol) {
      if (Array.isArray(resp[protocol])) {
        tabCtrl.addProtocolTab(protocol);
        if (hash[0] === protocol) {
          validHash[0] = protocol;
          if (hash[1] === 'default') {
            validHash[1] = hash[1];
          }
        }
        resp[protocol].forEach(function (listener) {
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
      }, 25);
    }
  }

  domready(function () {
    pure.compileTemplates();
    serverCtrl.getVersion(function (resp) {
      if (resp) {
        $('.js-version').html(resp.semver);
      }
    });
    serverCtrl.getAllListeners(initBuild);
  });

}());
