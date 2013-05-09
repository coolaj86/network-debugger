/*jshint strict:true, browser:true, es5:true, onevar:true, laxcomma:true, laxbreak:true*/

(function () {
  "use strict";

  var $ = require('ender')
    , url = require('url')
    , window = require('window')
    , location = window.location
    , lvlSelectors = [
        {
          tab: '.js-protocol-tab-template',
          window: '.js-protocol-window-template',
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
      attrs += '['+selectors.attribute+'='+value+']';
      $(selectors.tab + attrs).addClass('selected');
      $(selectors.window + attrs).show();
    });
  }

  global.window.addEventListener('hashchange', displayTab);

}());



