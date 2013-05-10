(function () {
  "use strict";

  var $ = require('ender')
    , url = require('url')
    , location = require('window').location
    , pure = require('./pure-inject')
    , serverCtrl = require('./server-ctrl')
    , streamCtrl = require('./stream-ctrl')
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
    var resource = location.hash
      , pathname
      , attrs = ''
      ;

    if (0 !== resource.indexOf('#/')) {
      location.hash = '#/' + location.hash;
      // we just change the hash so we should get this event again
      return;
    }

    pathname = url.parse(resource.substr(2), true, true).pathname;
    pathname.split('/').forEach(function (value, level) {
      var selectors = lvlSelectors[level]
        ;

      if (!selectors || !value) {
        return;
      }

      // first deactivate all subcomponents of this part of the tree
      $(selectors.tab + attrs).removeClass('selected');
      $(selectors.window + attrs).hide();

      // then specify which branch to enter now and activate it
      attrs += '['+selectors.attribute+'="'+value+'"]';
      $(selectors.tab + attrs).addClass('selected');
      $(selectors.window + attrs).show();
    });
  }

  function addProtocolTab(protocol) {
    pure.injectProtocolTab(protocol);
  }

  function stateChange(protocol, port, open) {
    if(protocol === 'all'){
      $('.js-ui-tab-view.js-all').addClass('css-inactive');
      $('.js-ui-tab-view.js-all').removeClass('css-active');
    }
    else if(open){
      $('.js-ui-tab-view[data-name="'+protocol+'"]').addClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"]').removeClass('css-inactive');
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').addClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').removeClass('css-inactive');
    }
    else {
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').removeClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').addClass('css-inactive');

      if($('.js-ui-tab-view[data-name="'+protocol+'"] .js-tab-bar').children().length <= 1) {
        $('.js-ui-tab-view[data-name="'+protocol+'"]').removeClass('css-active');
        $('.js-ui-tab-view[data-name="'+protocol+'"]').addClass('css-inactive');
      }
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
      location.hash = '#/'+protocol+'/'+port;
    }
    if (count !== 1) {
      // notify user
    }
    updateListenerSettings(protocol, port, logSettings);

    stateChange(protocol, port, true);

    options.active = true;
    options.cssClass = 'css-streamNewConnection';
    options.protocol = protocol;
    options.body = protocol.toUpperCase() + ' listener open on port ' + port;

    streamCtrl.injectMessage(options, 'default');
    streamCtrl.injectMessage(options, port);
  }

  function deactivateTab(protocol, port){
    stateChange(protocol, port, false);
  }

  function closeListenerTab(protocol, port) {
    var selector
      ;

    // TODO: make conditional on still being open
    serverCtrl.closeListener(protocol, port);

    selector  = '[data-protocol="' + protocol + '"]';
    selector += '[listener-port="' + port + '"]';

    $('.js-listener-tab'+selector).remove();
    $('.js-listener-window'+selector).remove();

    // if the tab closed is the one we were on go to the default tab
    if (location.hash === '#/'+protocol+'/'+port) {
      location.hash = '#/'+protocol+'/default';
    }

    // if only the default tab is left then hide the tab bar again
    if ($('.js-listener-tab-bar[data-protocol='+protocol+']').children().length <= 1){
      $('.js-listener-tab-bar[data-protocol='+protocol+']').addClass('css-hidden');
    }
  }

  global.window.addEventListener('hashchange', displayTab);

  module.exports.addProtocolTab = addProtocolTab;
  module.exports.updateListenerSettings = updateListenerSettings;
  module.exports.addListenerTab = addListenerTab;
  module.exports.deactivateTab = deactivateTab;
  module.exports.closeListenerTab = closeListenerTab;
}());
