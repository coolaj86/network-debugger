/*jshint strict:true, browser:true, es5:true, onevar:true, laxcomma:true, laxbreak:true*/

(function () {
  "use strict";

  var $ = require('ender')
    , url = require('url')
    , window = require('window')
    , location = window.location
    ;

  function create(root, uiTabs, uiTab, uiView, defaultView) {

    function displayTab() {
      var resource = location.hash
        , urlObj
        , pathname
        ;

      if (0 !== resource.indexOf('#/')) {
        location.hash = '#/' + defaultView;
        return;
      }

      urlObj = url.parse(resource.substr(1), true, true);

      pathname = urlObj.pathname.substr(1).replace('/', '_');
      $(uiView).hide();
      $(uiTab).removeClass('selected');
      urlObj.pathname.split('/').forEach(function(view){
        if(!view){
          return;
        }
        if (0 === $(uiView + '[data-name=' + view + ']').length) {
          location.hash = '#/' + defaultView;
          return;
        }
        $(uiView + '[data-name=' + view + ']').show();
        $(uiTab + '.js-' + view).addClass('selected');
      });
    }

    global.window.addEventListener('hashchange', displayTab);
  }

  module.exports.create = create;
}());



