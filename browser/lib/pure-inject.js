/*jshint strict:true, browser:true, es5:true, onevar:true, laxcomma:true, laxbreak:true*/
(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , pure = require('./pure').$p
    , messageDir
    , messageTemplate
    , codeDir
    , codeTemplate
    , protocolTabTemplate
    , protocolWindowTemplate
    , listenerTabTemplate
    , listenerWindowTemplate
    ;

  messageDir = {
    'div': 'time',
    'span': 'body',
    '@class': 'cssClass'
  };
  codeDir = {
    'div': 'time',
    'span': 'code',
    'code': 'xml'
  };

  function compileTemplates() {
    protocolTabTemplate = pure('.js-protocol-tab-template').compile({
      '@data-name': 'protocol',
      '@data-protocol': 'protocol',
      'a@href': 'href',
      'a': 'display'
    });
    protocolWindowTemplate = pure('.js-protocol-window-template').compile({
      '@data-protocol': 'protocol',
      'div.js-listener-tab-bar@data-protocol': 'protocol',
      'div.js-listener-tab-bar li@data-protocol': 'protocol',
      'div.js-listener-tab-bar li a@href': 'href',
      'div.js-listener-container@data-protocol': 'protocol',
      'div.js-listener-container div.js-listener-window@data-protocol': 'protocol',
      'div.js-listener-container div.js-listener-window a@data-protocol': 'protocol',
      'div.js-listener-container div.js-listener-window div.js-listen-form input@data-protocol': 'protocol',
      'div.js-listener-container div.js-listener-window div.js-listen-form a@data-protocol': 'protocol'
    });

    listenerTabTemplate = pure('.js-listener-tab-template').compile({
      'a': 'display',
      'a@href': 'href',
      '@data-protocol': 'protocol',
      '@listener-port': 'portNum',
      'span@data-protocol': 'protocol',
      'span@listener-port': 'portNum'
    });
    listenerWindowTemplate = pure('.js-listener-window-template').compile({
      '@data-protocol': 'protocol',
      '@listener-port': 'portNum',
      'div.js-connection-info a@data-protocol': 'protocol',
      'div.js-connection-info a@listener-port': 'portNum',
      'div.js-connection-info div@data-protocol': 'protocol',
      'div.js-connection-info div@listener-port': 'portNum',
      'div.js-logging-info a@data-protocol': 'protocol',
      'div.js-logging-info a@listener-port': 'portNum',
      'div.js-logging-info div p input@data-protocol': 'protocol',
      'div.js-logging-info div p input@listener-port': 'portNum',
      'div.js-listener-stream@data-protocol': 'protocol',
      'div.js-listener-stream@listener-port': 'portNum',
      'a@data-protocol': 'protocol',
      'a@listener-port': 'portNum'
    });

    messageTemplate = pure('.js-message-template').compile(messageDir);
    codeTemplate = pure('.js-code-template').compile(codeDir);
    //tabContainerTemplate = pure('.js-tab-container-template').compile(tabContainerDir);
  }

  function injectProtocolTab(protocol) {
    var opts = {}
      , newElement
      ;

    opts.protocol = protocol;
    opts.display  = protocol.toUpperCase();
    opts.href = '#/'+protocol+'/default';

    newElement = protocolTabTemplate(opts);
    newElement = $(newElement).removeClass('js-protocol-tab-template');
    $('.js-protocol-tab-bar').append(newElement);

    newElement = protocolWindowTemplate(opts);
    newElement = $(newElement).removeClass('js-protocol-window-template');
    $('.container').append(newElement);
  }

  function injectListenerTab(protocol, portNum) {
    var opts = {}
      , newElement
      ;

    opts.protocol = protocol;
    opts.portNum  = portNum;
    opts.display  = portNum;
    opts.href = '#/'+protocol+'/'+portNum;

    newElement = listenerTabTemplate(opts);
    newElement = $(newElement).removeClass('js-listener-tab-template');
    $('.js-listener-tab-bar[data-protocol='+protocol+']').append(newElement);
    $('.js-listener-tab-bar[data-protocol='+protocol+']').removeClass('css-hidden');

    newElement = listenerWindowTemplate(opts);
    newElement = $(newElement).removeClass('js-listener-window-template');
    $('.js-listener-container[data-protocol='+protocol+']').append(newElement);
  }

  function injectMessage(options, data) {
    var selector
      ;

    if (!options.hasOwnProperty('protocol')) {
      console.error('received code injection request without protocol');
      return;
    }
    if (!options.hasOwnProperty('port')) {
      console.error('received code injection request without port');
      return;
    }
    data = data || options;

    selector  = '[data-protocol="' + options.protocol + '"]';
    selector  = '[listener-port="' + options.port + '"]';
    data.time = new Date().toString();
    $('.js-listener-stream' + selector).append(messageTemplate(data));
  }

  function injectCode(options, data) {
    var selector
      ;

    if (!options.hasOwnProperty('protocol')) {
      console.error('received code injection request without protocol');
      return;
    }
    if (!options.hasOwnProperty('port')) {
      console.error('received code injection request without port');
      return;
    }

    selector  = '[data-protocol="' + options.protocol + '"]';
    selector  = '[listener-port="' + options.port + '"]';
    data.time = new Date().toString();
    $('.js-listener-stream' + selector).append(codeTemplate(data));
  }

  module.exports.compileTemplates = compileTemplates;
  module.exports.injectProtocolTab = injectProtocolTab;
  module.exports.injectCode = injectCode;
  module.exports.injectMessage = injectMessage;
  module.exports.injectListenerTab = injectListenerTab;
}());
