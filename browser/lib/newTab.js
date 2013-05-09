/*jshint strict:true, browser:true, es5:true, onevar:true, laxcomma:true, laxbreak:true*/
(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , pure = require('./pure-inject')
    , notPure = require('./not-so-pure')
    , window = require('window')
    ;

  function makeNew(protocol, port, logSettings) {
    pure.injectListenerTab(protocol, port);

    notPure.injectTabView(protocol, port, logSettings);

    // now that we have atleast one tab open display the default tab as visible
    $('.js-listener-tab-bar[data-protocol='+protocol+']').removeClass('css-hidden');
    // $('.js-ui-tab-view[data-name="' + protocol + '"] .js-tab-container').css('margin-bottom', '20px');

    // switch to the new tab
    window.location.hash = '/'+protocol+'/'+port;
  }

  function closeTab(protocol, port, that) {
    $(that).closest('.js-listener-tab').remove();
    $('.js-ui-tab-view[data-name="'+port+'"]').remove();

    // if the tab closed is the one we were on go to the default tab
    if (window.location.hash === '#/'+protocol+'/'+port) {
      window.location.hash = '#/'+protocol+'/default';
    }

    if ($('.js-listener-tab-bar[data-protocol='+protocol+']').children().length <= 1){
      $('.js-listener-tab-bar[data-protocol='+protocol+']').addClass('css-hidden');
      // $('.js-ui-tab-view[data-name="' + protocol + '"] .js-tab-container').css('margin-bottom', '0px');
    }
  }

  module.exports.makeNew = makeNew;
  module.exports.closeTab = closeTab;
}());
