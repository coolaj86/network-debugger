(function () {
  "use strict";

  var reqwest = require('reqwest')
    , location = require('window').location
    , streamCtrl = require('./stream-ctrl')
    ;

  function createHandlers(protocol, port, purpose) {

    function reportError(message) {
      var options = {}
        ;
      options.cssClass = 'css-streamError';
      options.body = message;

      streamCtrl.injectMessage(protocol, 'default', options);
      if (port) {
        streamCtrl.injectMessage(protocol, port, options);
      }
    }

    function error(err) {
      console.error('Server Error: ', err);
      reportError('Cannot communicate with netbug server to ' + purpose);
    }

    function success(resp) {
      var knownErr = false;
      // If there wasn't an error, we will get the event listenerClosed,
      // which should trigger anything we would want to do on success
      if (resp.success && (!resp.result || !resp.result.error)) {
        return;
      }

      if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
        reportError(resp.result.error);
        knownErr = true;
      }
      if (Array.isArray(resp.errors)) {
        resp.errors.forEach(function (error) {
          reportError(error.message || error.code);
          knownErr = true;
        });
      }
      if (!knownErr) {
        reportError('Unknown error trying to ' + purpose);
      }
    }

    return {
      error: error,
      success: success
    };
  }

  function getAllListeners(cb) {
    var handlers = createHandlers('all', 'all', 'acquire active listeners')
      ;

    function error() {
      cb();
      handlers.error.apply(null, arguments);
    }
    function success(resp) {
      if (resp.success && resp.result && !resp.result.error) {
        cb(resp);
      }
      else {
        cb();
        handlers.success.apply(null, arguments);
      }
    }

    reqwest({
        url: 'http://'+location.host+'/onPageLoad'
      , type: 'json'
      , method: 'get'
      , error: error
      , success: success
    });
  }

  function openListener(protocol, port) {
    var purpose = 'open ' + protocol.toUpperCase() + ' listener on port ' + port
      , handlers = createHandlers(protocol, null, purpose)
      , options = {}
      ;

    if (isNaN(port) || port < 0 || port > 65535) {
      options.cssClass = 'css-streamError';
      options.body = 'Specified port must be a number between 0 and 65535';
      streamCtrl.injectMessage(protocol, 'default', options);
      return;
    }

    reqwest({
        url: 'http://'+location.host+'/listeners/'+protocol+'/'+port
      , type: 'json'
      , method: 'post'
      , error: handlers.error
      , success: handlers.success
    });
  }

  function setListenerLogging(protocol, port, settings) {
    var purpose = 'change log setting for ' + protocol.toUpperCase() + ' listener on port ' + port
      , handlers = createHandlers(protocol, port, purpose)
      ;

    reqwest({
        url: 'http://'+location.host+'/listeners/'+protocol+'/'+port
      , type: 'json'
      , method: 'put'
      , contentType: 'application/json'
      , data: JSON.stringify(settings)
      , error: handlers.error
      , success: handlers.success
    });
  }

  function closeListener(protocol, port) {
    var purpose = 'close ' + protocol.toUpperCase() + ' listener on port ' + port
      , handlers = createHandlers(protocol, port, purpose)
      ;

    reqwest({
        url: 'http://'+location.host+'/listeners/'+protocol+'/'+port
      , type: 'json'
      , method: 'delete'
      , error: handlers.error
      , success: handlers.success
    });
  }

  module.exports.getAllListeners = getAllListeners;
  module.exports.openListener = openListener;
  module.exports.setListenerLogging = setListenerLogging;
  module.exports.closeListener = closeListener;

}());
