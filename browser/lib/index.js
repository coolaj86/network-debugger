/*jshint strict:true, browser:true, es5:true, onevar:true, laxcomma:true, laxbreak:true*/
/*
 * BROWSER
 */

(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , reqwest = require('reqwest')
    , window = require('window')
    , document = window.document
    , io = require('socket.io-browser')
    , socket
    , pd = require('pretty-data').pd
    , pure = require('./pure-inject')
    , visual = require('./visual')
    ;

  require('./ui-tabs');

  function processBody(options, data) {
    var xml
      , xml_pp
      , json_pp
      ;

    if (!data) {
      data = {};
    }
    if (!options || !options.hasOwnProperty('body')) {
      console.error('options has no body:', JSON.stringify(options));
      data.code += 'No Body';
      return data;
    }

    //if xml
    if (options.body.substring(0,3) === '<?x') {
      xml_pp = pd.xml(options.body);
      xml = xml_pp.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
      data.xml = xml;
    }
    //if json
    else if (options.body.charAt(0) === '{') {
      json_pp = JSON.parse(options.body);
      json_pp = JSON.stringify(json_pp, null, '  ');
      json_pp = visual.syntaxHighlight(json_pp);
      data.code += json_pp;
    }
    else {
      data.code += options.body;
    }
    return data;
  }

  function scrollLock(protocol, port) {
    var selector = '.js-ui-tab-view[data-name="'+port+'"]'
      ;

    if ($(selector +' .js-scroll.js-'+protocol).attr('checked') && $(selector +' .js-'+protocol+'-stream')[0].scrollHeight !== 0) {
      $(selector + ' .js-'+protocol+'-stream')[0].scrollTop = $(selector +' .js-'+protocol+'-stream')[0].scrollHeight;
    }
    if ($(selector +' .js-'+protocol+'-stream').children().length > 9) {
      //console.log('cleared space: '+portName);
      $(selector +' .js-'+protocol+'-stream span').first().remove();
      $(selector +' .js-'+protocol+'-stream span').first().remove();
    }
  }

  function preInjectCode(options) {
    var data = {};
    data.code = options.headers || '';
    data = processBody(options, data);

    pure.injectCode(options, data);
    scrollLock(options.protocol, options.port);
    visual.highlightMsg(options);
  }

  function injectMessage(options, port) {
    options.port = port;
    pure.injectMessage(options);
    scrollLock(options.protocol, port);
  }

  function openListener(protocol, port) {
    var options = {}
      ;

    // we only use the options here for error reporting
    options.protocol = protocol;
    options.cssClass = 'css-streamError';
    options.port = 'default';


    if (isNaN(port) || port < 0 || port > 65535) {
      options.body = 'Specified port must be a number between 0 and 65535';
      injectMessage(options, 'default');
      return;
    }

    reqwest({
      url: 'http://'+window.location.host+'/listeners/'+protocol+'/'+port
    , type: 'json'
    , method: 'post'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        injectMessage(options, 'default');
      }
    , success: function (resp) {
        if (!resp.error && (!resp.result || !resp.result.error)) {
          // If there wasn't an error, we will get the event listenerCreated,
          // which should trigger anything we would want to do on success
          return;
        }

        if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
          options.body = resp.result.error;
          injectMessage(options, 'default');
        }
        if (Array.isArray(resp.errors)) {
          resp.errors.forEach(function (error) {
            if (typeof error.message === 'string') {
              options.body = error.message;
            }
            else {
              options.body = error.message.message || error.message.toString();
            }

            injectMessage(options, 'default');
          });
        }
        if (!options.body) {
          options.body = 'Unknown error opening linstener';
          injectMessage(options, 'default');
        }
      }
    });
  }

  function setListenerLogging(protocol, port, settings) {
    var options = {}
      ;

    options.body = '';
    options.protocol = protocol;
    options.port = port;

    reqwest({
      url: 'http://'+window.location.host+'/listeners/'+protocol+'/'+port
    , type: 'json'
    , method: 'put'
    , contentType: 'application/json'
    , data: JSON.stringify(settings)
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    , success: function (resp) {
        // If there wasn't an error, we will get the event listenerChanged,
        // which should trigger anything we would want to do on success
        if (!resp.error && (!resp.result || !resp.result.error)) {
          return;
        }

        options.body = '';
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
          options.body = 'Unknown error changing log settings for listener';
        }

        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    });
  }

  function closeListener(protocol, port) {
    var options = {}
      ;

    options.protocol = protocol;
    options.port = port;

    reqwest({
      url: 'http://'+window.location.host+'/listeners/' + options.protocol + '/' + options.port
    , type: 'json'
    , method: 'delete'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    , success: function (resp) {
        // If there wasn't an error, we will get the event listenerClosed,
        // which should trigger anything we would want to do on success
        if (!resp.error && (!resp.result || !resp.result.error)) {
          return;
        }

        options.body = '';
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
          options.body = 'Unknown error closing listener';
        }

        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    });
  }


  function updateListenerSettings(listener) {
    var selector
      , logSettings = listener.logSettings
      ;

    selector  = '.js-listener-window';
    selector += '[data-protocol="' + listener.protocol + '"]';
    selector += '[listener-port="' + listener.port + '"]';

    if (logSettings.logData) {
      $(selector).find('.js-toggle-log').addClass('activeLog');
    }
    else {
      $(selector).find('.js-toggle-log').removeClass('activeLog');
    }

    if (logSettings.hasOwnProperty('includeHeaders')) {
      $(selector).find('.js-log-headers-display').show();
      $(selector).find('.js-save-headers').attr('checked', !!logSettings.includeHeaders);
    }
    else {
      $(selector).find('.js-log-headers-display').hide();
    }

    $(selector).find('.js-separate-packets').attr('checked', !!logSettings.separateFiles);
  }

  function addListenerTab(listener) {
    var options = {}
      , count
      , selector
      ;

    selector  = '.js-listener-window';
    selector += '[data-protocol="' + listener.protocol + '"]';
    selector += '[listener-port="' + listener.port + '"]';

    count = $(selector).length;
    if (count === 0) {
      pure.injectListenerTab(listener.protocol, listener.port);
      count = $(selector).length;
      location.hash = '#/'+listener.protocol+'/'+listener.port;
    }
    if (count !== 1) {
      // notify user
    }
    updateListenerSettings(listener);

    visual.stateChange(listener.protocol, listener.port, true);

    options.active = true;
    options.cssClass = 'css-streamNewConnection';
    options.protocol = listener.protocol;
    options.body = listener.protocol.toUpperCase() + ' listener open on port ' + listener.port;

    injectMessage(options, 'default');
    injectMessage(options, listener.port);
  }

  function closeListenerTab(protocol, port) {
    var selector
      ;

    // TODO: make conditional on still being open
    closeListener(protocol, port);

    selector  = '[data-protocol="' + protocol + '"]';
    selector += '[listener-port="' + port + '"]';

    $('.js-listener-tab'+selector).remove();
    $('.js-listener-window'+selector).remove();

    // if the tab closed is the one we were on go to the default tab
    if (window.location.hash === '#/'+protocol+'/'+port) {
      window.location.hash = '#/'+protocol+'/default';
    }

    // if only the default tab is left then hide the tab bar again
    if ($('.js-listener-tab-bar[data-protocol='+protocol+']').children().length <= 1){
      $('.js-listener-tab-bar[data-protocol='+protocol+']').addClass('css-hidden');
    }
  }

  //EVENT LISTENERS ALL
  $('.container').delegate('.js-openSocket', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = Number($('.js-portNum[data-protocol="'+protocol+'"]').val())
      ;

    openListener(protocol, port);
  });
  $('.container').delegate('.js-portNum', 'keypress', function (e) {
    if (e.keyCode === 13) {
      $('.js-openSocket[data-protocol="'+$(this).attr('data-protocol')+'"]').trigger('click');
    }
  });

  $('.container').delegate('.js-all-stream pre', 'click', function () {
    $(this).toggleClass('css-hl-block');
  });
  $('.container').delegate('.js-scroll', 'change', function () {
    scrollLock($(this).attr('data-protocol'), $(this).closest('.js-ui-tab-view').attr('data-name'));
  });
  $('.container').delegate('.js-clear', 'click', function () {
    $(this).closest('.js-ui-tab-view').find('.js-'+$(this).attr('data-protocol')+'-stream').html('');
  });

  $('.container').delegate('.js-toggle-log', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).attr('listener-port')
      , curState = $(this).hasClass('activeLog')
      ;

    setListenerLogging(protocol, port, {logData: !curState});
  });
  $('.container').delegate('.js-separate-packets', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).attr('listener-port')
      , curState = $(this).attr('checked')
      ;

    // for the check boxes the state changes to was the user wants before we get the event
    setListenerLogging(protocol, port, {separateFiles: curState});
  });
  $('.container').delegate('.js-save-headers', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).attr('listener-port')
      , curState = $(this).attr('checked')
      ;

    // for the check boxes the state changes to was the user wants before we get the event
    setListenerLogging(protocol, port, {includeHeaders: curState});
  });

  $('.container').delegate('.js-close-listener', 'click', function () {
    closeListener($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  $('.container').delegate('.js-reopen-listener', 'click', function () {
    openListener($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });
  $('.container').delegate('.js-close-listener-tab', 'click', function () {
    closeListenerTab($(this).attr('data-protocol'), $(this).attr('listener-port'));
  });

  //SOCKET COMMUNICATION WITH SERVER
  function openSocket(port) {
    socket = io.connect('http://'+window.location.hostname+':'+port);

    socket.on('listenerCreated', addListenerTab);
    socket.on('listenerChanged', updateListenerSettings);

    socket.on('connect', function () {
      socket.send('hi');


      socket.on('listenerData', function (msg) {
        preInjectCode(msg);
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
        injectMessage(options, 'default');
        injectMessage(options, msg.port);

        visual.stateChange(msg.protocol, msg.port, false);
      });

      socket.on('disconnect', function () {
        var options = {};

        console.log('Browser-Disconnected socket');
        options.cssClass = 'css-streamError';
        options.body = 'NetBug Server Down';
        options.protocol = 'all';
        injectMessage(options, 'default');
        options.active = false;
        visual.stateChange('all');
      });

    });
  }

  function initBuild(resp) {

    openSocket(resp.result.socketPort);
    // delete the socket port to make sure it isn't interpretted as a protocol
    delete resp.result.socketPort;

    Object.keys(resp.result).forEach(function (protocol) {
      if (Array.isArray(resp.result[protocol])) {
        pure.injectProtocolTab(protocol);
        resp.result[protocol].forEach(function (listener) {
          listener.protocol = protocol;
          listener.port = listener.port || listener.portNum;
          addListenerTab(listener);
        });
      }
    });
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
        injectMessage(options, 'default');
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
          injectMessage(options, 'default');
        }
      }
    });
  });

}());
