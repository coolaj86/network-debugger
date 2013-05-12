(function () {
  "use strict";

  var $ = require('ender')
    , location = require('window').location
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

    location.hash = newHash;
  }

  function addProtocolTab(protocol) {
    pure.injectProtocolTab(protocol);

    if (!firstProtocol) {
      firstProtocol = protocol;
      initialTimeout = setTimeout(displayTab, 100, firstProtocol);
    }
  }

  function stateChange(protocol, port, open) {
    var selector = ''
      , buttonEl
      ;

    if (protocol !== 'all') {
      selector += '[data-protocol="' + protocol + '"]';
      selector += '[listener-port="' + port + '"]';
    }

    if (open) {
      $('.js-listener-tab' + selector).addClass('css-active');
      $('.js-listener-tab' + selector).removeClass('css-inactive');
      $('.js-listener-window' + selector).addClass('css-active');
      $('.js-listener-window' + selector).removeClass('css-inactive');

      buttonEl = $('.js-listener-window' + selector).find('.js-reopen-listener');
      buttonEl.removeClass('js-reopen-listener');
      buttonEl.addClass('js-close-listener');
      buttonEl.html('Close Listener');
    }
    else {
      $('.js-listener-tab' + selector).addClass('css-inactive');
      $('.js-listener-tab' + selector).removeClass('css-active');
      $('.js-listener-window' + selector).addClass('css-inactive');
      $('.js-listener-window' + selector).removeClass('css-active');

      buttonEl = $('.js-listener-window' + selector).find('.js-close-listener');
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

  function addListenerTab(protocol, port, logSettings) {
    var options = {}
      , count
      , selector
      ;

    selector  = '.js-listener-window';
    selector += '[data-protocol="' + protocol + '"]';
    selector += '[listener-port="' + port + '"]';

    count = $(selector).length;
    if (count === 0) {
      pure.injectListenerTab(protocol, port);
      count = $(selector).length;
    }
    if (count !== 1) {
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
    if ($('.js-listener-tab-bar[data-protocol='+protocol+']').children().length <= 1){
      $('.js-listener-tab-bar[data-protocol='+protocol+']').addClass('css-hidden');
    }
  }

  module.exports.addProtocolTab = addProtocolTab;
  module.exports.updateListenerSettings = updateListenerSettings;
  module.exports.addListenerTab = addListenerTab;
  module.exports.deactivateTab = deactivateTab;
  module.exports.closeListenerTab = closeListenerTab;
  module.exports.displayTab = displayTab;
}());
