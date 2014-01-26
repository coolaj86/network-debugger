(function () {
  "use strict";
  var bonzo = require('bonzo')
    , qwery = require('qwery')
    , bean = require('bean')
    , pure = require('pure').$p
    , protocolTabTemplate
    , protocolWindowTemplate
    , listenerTabTemplate
    , listenerWindowTemplate
    ;

  function $() {
    return bonzo(qwery.apply(null, arguments));
  }

  function compileTemplates() {
    var directive = {}
      ;

    directive.a = 'display';
    ['', 'a', 'span'].forEach(function (type) {
      directive[type+'@data-protocol'] = 'protocol';
      directive[type+'@listener-port'] = 'portNum';
    });

    protocolTabTemplate = pure('.js-protocol-tab-template').compile(directive);
    listenerTabTemplate = pure('.js-listener-tab-template').compile(directive);

    delete directive.a;
    ['div', 'input', 'li'].forEach(function (type) {
      directive[type+'@data-protocol'] = 'protocol';
      directive[type+'@listener-port'] = 'portNum';
    });
    protocolWindowTemplate = pure('.js-protocol-window-template').compile(directive);
    listenerWindowTemplate = pure('.js-listener-window-template').compile(directive);
  }

  function injectProtocolTab(protocol) {
    var opts = {}
      , newElement
      ;

    opts.protocol = protocol;
    opts.display  = protocol.toUpperCase();
    newElement = bonzo.create(protocolTabTemplate(opts));
    bonzo(newElement).removeClass('js-protocol-tab-template');
    $('.js-protocol-tab-bar').append(newElement);

    opts.portNum = 'default';
    newElement = bonzo.create(protocolWindowTemplate(opts));
    bonzo(newElement).removeClass('js-protocol-window-template');
    $('.container').append(newElement);
  }

  function preventDefault(event) {
    // the check box changes the checked attribute immediately, so switch
    // it back to what it was before so we can handle the event our way
    $(event.target).attr('checked', !$(event.target).attr('checked'));
    event.preventDefault();
  }

  function injectListenerTab(protocol, portNum) {
    var opts = {}
      , newElement
      ;

    opts.protocol = protocol;
    opts.portNum  = portNum;
    opts.display  = portNum;

    newElement = bonzo.create(listenerTabTemplate(opts));
    bonzo(newElement).removeClass('js-listener-tab-template');
    $('.js-listener-tab-bar[data-protocol='+protocol+']').append(newElement);
    $('.js-listener-tab-bar[data-protocol='+protocol+']').removeClass('css-hidden');

    newElement = bonzo.create(listenerWindowTemplate(opts));
    bonzo(newElement).removeClass('js-listener-window-template');
    qwery('.js-logging-options input[type="checkbox"]', newElement).forEach(function (box) {
      bean.on(box, 'click', preventDefault);
    });
    $('.js-scroll-lock', newElement).attr('checked', true);
    $('.js-listener-container[data-protocol='+protocol+']').append(newElement);
  }

  module.exports.compileTemplates = compileTemplates;
  module.exports.injectProtocolTab = injectProtocolTab;
  module.exports.injectListenerTab = injectListenerTab;
}());
