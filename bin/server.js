#!/usr/bin/env node
/*jshint node:true, laxcomma:true*/
(function () {
  "use strict";

  var path = require('path')
    , ArgumentParser = require('argparse').ArgumentParser
    , init = require('../server').init
    ;

  require('colors');

  function parseArgs() {
    var parser
      , args
      ;

    parser = new ArgumentParser({
      version: require('../package.json').version,
      description: require('../package.json').description,
      addHelp: true
    });

    parser.addArgument(
      ['-p', '--port'],
      {
        action: 'store',
        type: 'int',
        dest: 'port',
        metavar: '#',
        help: 'The port on which the UI web pages are served'
      }
    );
    parser.addArgument(
      ['-l', '--log-dir'],
      {
        action: 'store',
        type: 'string',
        dest: 'logDir',
        metavar: 'DIR',
        help: 'The directory to place the log files'
      }
    );

    // legacy support options
    parser.addArgument(
      ['legacyOpts'],
      {
        nargs: '*',
        help: 'Legacy options from before we had a proper parser'
      }
    );

    args = parser.parseArgs();

    if (args.legacyOpts.length > 0) {
      if (args.port !== null || args.logDir !== null) {
        console.error('Do not mix floating arguments and options'.underline.red);
        return args;
      }
      console.warn('floating arguments are now discouraged, please use -h or --help for details'.yellow);

      if (!isNaN(args.legacyOpts[0])) {
        args.port = args.legacyOpts[0];
      }
      if (args.legacyOpts[1]) {
        args.logDir = args.legacyOpts[1];
      }
      delete args.legacyOpts;
    }

    return args;
  }

  function run(options) {
    var app
      , server
      ;

    function onListening() {
      var addr = server.address()
        ;

      console.log("Listening on http://%s:%d", addr.address, addr.port);
    }

    if (!options.logDir) {
      options.logDir = './netbug-logs';
    }
    options.logDir = path.resolve(options.logDir);

    if (isNaN(options.port)) {
      options.port = 0;
    }

    app = init(options.logDir);
    server = app.listen(options.port, onListening);
  }

  if (require.main === module) {
    run(parseArgs());
  }
}());
