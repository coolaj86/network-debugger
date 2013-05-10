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
    , timestampDir
    , timestampTemplate
    , protocolTabTemplate
    , protocolWindowTemplate
    , listenerTabTemplate
    ;

  messageDir = {
    'span': 'body',
    '@class': 'cssClass'
  };
  codeDir = {
    'span': 'code',
    'code': 'xml'
  };
  timestampDir = {
    'div': 'time'
  };
  /*tabContainerDir = {
    'div.js-ui-tab-view@data-name': 'port-num',
    '.js-ui-tab-view .css-listen-form .js-port-num@class': 'class-protocol',
    //'.js-ui-tab-view .css-listen-form span.js-port-num@data-protocol': 'protocol',
    //'.js-ui-tab-view .css-listen-form .js-port-num': 'port-num',
    //'a.js-log@class': 'class-protocol',
    'a.js-log@data-protocol': 'protocol',
    //'div.js-closeSocket@class': 'class-protocol',
    'div.js-closeSocket@data-protocol': 'protocol',
    'div.js-clear@class': 'class-protocol',
    'div.js-clear@data-protocol': 'protocol',
    'div.js-scroll@class': 'class-protocol',
    'div.js-scroll@data-protocol': 'protocol'
  };*/

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

    timestampTemplate = pure('.js-timestamp-template').compile(timestampDir);
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
  }

  function injectMessage(options, data) {

    var stream;

    if (!options.hasOwnProperty('protocol')) {
      console.error('received code injection request without protocol');
      return;
    }
    if (!options.hasOwnProperty('port')) {
      console.error('received code injection request without port');
      return;
    }
    data = data || options;

    stream = $('.js-ui-tab-view[data-name="'+options.port+'"] .js-'+options.protocol+'-stream');
    stream.append(addTime() + messageTemplate(data));
  }

  function injectCode(options, data) {
    var stream;

    if (!options.hasOwnProperty('protocol')) {
      console.error('received code injection request without protocol');
      return;
    }
    if (!options.hasOwnProperty('port')) {
      console.error('received code injection request without port');
      return;
    }

    stream = $('.js-ui-tab-view[data-name="'+options.port+'"] .js-'+options.protocol+'-stream');
    stream.append(addTime() + codeTemplate(data));
  }

  function addTime () {
    return timestampTemplate({'time': new Date().toString()});
  }

  module.exports.compileTemplates = compileTemplates;
  module.exports.injectProtocolTab = injectProtocolTab;
  module.exports.injectCode = injectCode;
  module.exports.injectMessage = injectMessage;
  module.exports.injectListenerTab = injectListenerTab;
}());
