(function () {
  "use strict";

  var reqwest = require('reqwest')
    , location = require('window').location
    , streamCtrl = require('./stream-ctrl')
    ;

  function openListener(protocol, port) {
    var options = {}
      ;

    // we only use the options here for error reporting
    options.protocol = protocol;
    options.cssClass = 'css-streamError';
    options.port = 'default';


    if (isNaN(port) || port < 0 || port > 65535) {
      options.body = 'Specified port must be a number between 0 and 65535';
      streamCtrl.injectMessage(options, 'default');
      return;
    }

    reqwest({
      url: 'http://'+location.host+'/listeners/'+protocol+'/'+port
    , type: 'json'
    , method: 'post'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        streamCtrl.injectMessage(options, 'default');
      }
    , success: function (resp) {
        if (!resp.error && (!resp.result || !resp.result.error)) {
          // If there wasn't an error, we will get the event listenerCreated,
          // which should trigger anything we would want to do on success
          return;
        }

        if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
          options.body = resp.result.error;
          streamCtrl.injectMessage(options, 'default');
        }
        if (Array.isArray(resp.errors)) {
          resp.errors.forEach(function (error) {
            if (typeof error.message === 'string') {
              options.body = error.message;
            }
            else {
              options.body = error.message.message || error.message.toString();
            }

            streamCtrl.injectMessage(options, 'default');
          });
        }
        if (!options.body) {
          options.body = 'Unknown error opening linstener';
          streamCtrl.injectMessage(options, 'default');
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
      url: 'http://'+location.host+'/listeners/'+protocol+'/'+port
    , type: 'json'
    , method: 'put'
    , contentType: 'application/json'
    , data: JSON.stringify(settings)
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        streamCtrl.injectMessage(options, 'default');
        streamCtrl.injectMessage(options, options.port);
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

        streamCtrl.injectMessage(options, 'default');
        streamCtrl.injectMessage(options, options.port);
      }
    });
  }

  function closeListener(protocol, port) {
    var options = {}
      ;

    options.protocol = protocol;
    options.port = port;

    reqwest({
      url: 'http://'+location.host+'/listeners/' + options.protocol + '/' + options.port
    , type: 'json'
    , method: 'delete'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        streamCtrl.injectMessage(options, 'default');
        streamCtrl.injectMessage(options, options.port);
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

        streamCtrl.injectMessage(options, 'default');
        streamCtrl.injectMessage(options, options.port);
      }
    });
  }

  module.exports.openListener = openListener;
  module.exports.setListenerLogging = setListenerLogging;
  module.exports.closeListener = closeListener;

}());
