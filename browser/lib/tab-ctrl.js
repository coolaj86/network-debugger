(function () {
  "use strict";

  var qwery = require('qwery')
    , bonzo = require('bonzo')
    , bean = require('bean')
    , window = require('window')
    , pure = require('./pure-inject')
    , serverCtrl = require('./server-ctrl')
    , streamCtrl = require('./stream-ctrl')
    , firstProtocol
    , initialTimeout
    , lvlSelectors = [
        {
          tab: '.js-protocol-tab',
          window: '.js-protocol-window',
          attribute: 'data-protocol'
        },
        {
          tab: '.js-listener-tab',
          window: '.js-listener-window',
          attribute: 'listener-port'
        }
      ]
    ;

  function $(selector) {
    return bonzo(qwery(selector));
  }

  function displayTab() {
    var args = Array.prototype.slice.call(arguments)
      , attrs = ''
      , newHash = '#'
      ;

    args.every(function (value, level) {
      var selectors = lvlSelectors[level]
        , newAttr
        ;

      if (!selectors || !value) {
        return false;
      }
      newAttr = '['+selectors.attribute+'="'+value+'"]';
      if ($(selectors.tab + attrs + newAttr).length <= 0) {
        return false;
      }

      // first deactivate all subcomponents of this part of the tree
      $(selectors.tab + attrs).removeClass('tab-selected');
      $(selectors.window + attrs).addClass('css-hidden');

      // then specify which branch to enter now and activate it,
      attrs += newAttr;
      $(selectors.tab + attrs).addClass('tab-selected');
      $(selectors.window + attrs).removeClass('css-hidden');
      clearTimeout(initialTimeout);
      return true;
    });

    attrs = '';
    lvlSelectors.forEach(function (selector) {
      var value = $(selector.tab+'.tab-selected'+attrs).attr(selector.attribute)
        ;

      attrs += '['+selector.attribute+'="'+value+'"]';
      newHash += '/'+value;
    });

    window.location.hash = newHash;
    bean.fire(window, 'resize');
  }

  function addProtocolTab(protocol) {
    if (!firstProtocol) {
      firstProtocol = protocol;
      initialTimeout = setTimeout(displayTab, 100, firstProtocol);

      $('.js-protocol-window[data-protocol="default"]').remove();
    }

    pure.injectProtocolTab(protocol);
  }

  function stateChange(protocol, port, open) {
    var selector = ''
      , buttonEl
      ;

    if (protocol !== 'all') {
      selector += '[data-protocol="' + protocol + '"]';
    }
    if (port !== 'all') {
      selector += '[listener-port="' + port + '"]';
    }

    if (open) {
      $('.js-listener-tab' + selector).addClass('css-active');
      $('.js-listener-tab' + selector).removeClass('css-inactive');
      $('.js-listener-window' + selector).addClass('css-active');
      $('.js-listener-window' + selector).removeClass('css-inactive');

      buttonEl = $('.js-listener-window' + selector + ' .js-reopen-listener');
      buttonEl.removeClass('js-reopen-listener');
      buttonEl.addClass('js-close-listener');
      buttonEl.html('Close Listener');
    }
    else {
      $('.js-listener-tab' + selector).addClass('css-inactive');
      $('.js-listener-tab' + selector).removeClass('css-active');
      $('.js-listener-window' + selector).addClass('css-inactive');
      $('.js-listener-window' + selector).removeClass('css-active');

      buttonEl = $('.js-listener-window' + selector + ' .js-close-listener');
      buttonEl.removeClass('js-close-listener');
      buttonEl.addClass('js-reopen-listener');
      buttonEl.html('Reopen Listener');
    }
  }

  function updateListenerSettings(protocol, port, logSettings) {
    var selector
      ;

    selector  = '.js-listener-window';
    selector += '[data-protocol="' + protocol + '"]';
    selector += '[listener-port="' + port + '"]';

    $(selector + ' .js-log-display').hide();

    Object.keys(logSettings).forEach(function (key) {
      $(selector + ' .js-log-display[variable="'+key+'"]').show();
      $(selector + ' .js-log-ctrl[variable="'+key+'"]').attr('checked', !!logSettings[key]);
      $(selector + ' .js-log-ctrl[variable="'+key+'"]').attr('option-active', !!logSettings[key]);
    });
  }

  function addListenerTab(protocol, port, logSettings) {
    var options = {}
      , selector
      ;

    selector  = '.js-listener-window';
    selector += '[data-protocol="' + protocol + '"]';
    selector += '[listener-port="' + port + '"]';

    if (qwery(selector).length === 0) {
      pure.injectListenerTab(protocol, port);
    }
    if (qwery(selector).length !== 1) {
      // notify user
    }

    displayTab(protocol, port);
    updateListenerSettings(protocol, port, logSettings);
    stateChange(protocol, port, true);

    options.cssClass = 'css-streamNewConnection';
    options.body = protocol.toUpperCase() + ' listener open on port ' + port;

    streamCtrl.injectMessage(protocol, 'default', options);
    streamCtrl.injectMessage(protocol, port, options);
  }

  function deactivateTab(protocol, port){
    stateChange(protocol, port, false);
  }

  function closeListenerTab(protocol, port) {
    var selector = '[data-protocol="' + protocol + '"][listener-port="' + port + '"]'
      , tabBar
      , child
      ;

    if ($('.js-listener-window'+selector).hasClass('css-active')) {
      serverCtrl.closeListener(protocol, port);
    }

    // if the tab closed is the one we were on go to the default tab
    if (!$('.js-listener-window'+selector).hasClass('css-hidden')) {
      displayTab(protocol, 'default');
    }
    $('.js-listener-tab'+selector).remove();
    $('.js-listener-window'+selector).remove();

    // if only the default tab is left then hide the tab bar again
    tabBar = qwery('.js-listener-tab-bar[data-protocol='+protocol+']');
    if (tabBar.length !== 1) {
      console.error('multiple tab bars for', protocol);
      return;
    }
    child = bonzo.firstChild(tabBar[0]);
    if (!child) {
      console.log(protocol, 'tab bar has no children');
      return;
    }
    if (!child.nextSibling) {
      bonzo(tabBar).addClass('css-hidden');
    }
  }

  module.exports.addProtocolTab = addProtocolTab;
  module.exports.updateListenerSettings = updateListenerSettings;
  module.exports.addListenerTab = addListenerTab;
  module.exports.deactivateTab = deactivateTab;
  module.exports.closeListenerTab = closeListenerTab;
  module.exports.displayTab = displayTab;
}());
