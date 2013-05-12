/*
 * SERVER
 */
(function () {
  "use strict";

  require('http-json')(require('http'));

  var connect = require('connect')
    , pathname = require('connect-pathname')
    , xcors = require('connect-xcors')
    , gcf = require('express-chromeframe')
    , nowww = require('nowww')
    , cors = xcors()
    , app = connect()
    , version = require('../package.json').version
    , semver
    ;

  function parseSemver(version) {
    // semver, major, minor, patch
    // https://github.com/mojombo/semver/issues/32
    // https://github.com/isaacs/node-semver/issues/10
    // optional v
    var m = /^\s*(v)?([0-9]+)(\.([0-9]+))(\.([0-9]+))(([\-+])([a-zA-Z0-9\.]+))?\s*$/.exec(version) || []
      , ver = {
            semver: m[0] || version
          , major: m[2]
          , minor: m[4]
          , patch: m[6]
          , revision: m[7]
        }
      ;

    if (!/^v/.test(ver.semver)) {
      ver.semver = 'v' + ver.semver;
    }

    if ('+' === m[8]) {
      ver.build = m[9];
    }

    if ('-' === m[8]) {
      ver.release = m[9];
    }

    return ver;
  }

  function getVersion(req, res) {
    res.json(semver);
  }

  semver = parseSemver(version);

  connect.router = require('connect_router');
  connect.corsPolicy = cors.config;

  app
    .use(nowww())
    .use(gcf())
    .use(pathname())
    .use(connect.query())
    .use(connect.json())
    .use(connect.urlencoded())
    .use(cors)
    .use(connect.static(__dirname + '/../public'))
    .use(connect.static(__dirname + '/../var/public'))
    .use('/version', getVersion)
    .use(connect.favicon())
    ;

  module.exports = app;
}());
