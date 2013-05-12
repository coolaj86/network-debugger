(function () {
  "use strict";

  var $ = require('ender')
    , hljs = require('hljs')
    , pd = require('pretty-data').pd
    , pure = require('./pure-inject')
    ;

  function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g
    , function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
  }

  function highlightMsg(options) {
    $('.js-'+options.protocol+'-stream .highlight-me').forEach(function(el) {
      hljs.highlightBlock(el);
      $(el).removeClass('highlight-me');
    });
  }

  function processBody(options, data) {
    var xml
      , xml_pp
      , json_pp
      ;

    if (!data) {
      data = {};
    }
    if (!options || !options.hasOwnProperty('body')) {
      console.error('options has no body:', JSON.stringify(options));
      data.code += 'No Body';
      return data;
    }

    //if xml
    if (options.body.substring(0,3) === '<?x') {
      xml_pp = pd.xml(options.body);
      xml = xml_pp.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
      data.xml = xml;
    }
    //if json
    else if (options.body.charAt(0) === '{') {
      json_pp = JSON.parse(options.body);
      json_pp = JSON.stringify(json_pp, null, '  ');
      json_pp = syntaxHighlight(json_pp);
      data.code += json_pp;
    }
    else {
      data.code += options.body;
    }
    return data;
  }

  function scrollLock(protocol, port) {
    var selector = ''
      ;

    if (protocol !== 'all') {
      selector += '[data-protocol="'+protocol+'"]';
    }
    if (port !== 'all') {
      selector += '[listener-port="'+port+'"]';
    }

    $('.js-listener-stream'+selector).forEach(function (stream) {
      var subSelector = ''
        ;
      subSelector += '[data-protocol="'+$(stream).attr('data-protocol')+'"]';
      subSelector += '[listener-port="'+$(stream).attr('listener-port')+'"]';
      while (stream.scrollHeight > 3000 && $(stream).children().length > 5) {
        $(stream).children().first().remove();
      }
      if ($('.js-scroll-lock'+subSelector).attr('checked') && stream.scrollHeight !== 0) {
        stream.scrollTop = stream.scrollHeight;
      }
    });
  }

  function preInjectCode(options) {
    var data = {};
    data.code = options.headers || '';
    data = processBody(options, data);

    pure.injectCode(options, data);
    scrollLock(options.protocol, options.port);
    highlightMsg(options);
  }

  function injectMessage(options, port) {
    options.port = port;
    pure.injectMessage(options);
    scrollLock(options.protocol, port);
  }

  function clearStream(protocol, port) {
    var selector = ''
      ;

    if (protocol !== 'all') {
      selector += '[data-protocol="'+protocol+'"]';
    }
    if (port !== 'all') {
      selector += '[listener-port="'+port+'"]';
    }

    $('.js-listener-stream'+selector).html('');
  }

  module.exports.preInjectCode = preInjectCode;
  module.exports.injectMessage = injectMessage;
  module.exports.scrollLock    = scrollLock;
  module.exports.clearStream   = clearStream;
}());
