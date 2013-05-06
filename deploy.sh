#!/usr/bin/env bash

DEV_MODE=${DEV_MODE}

set -e
set -u

pushd server
  npm install
popd

pushd browser
  WEBPUB='../public'
  rm -rf "${WEBPUB}"
  mkdir -p "${WEBPUB}/"

  rsync -a static/ "${WEBPUB}/"

  jade index.jade
  mv index.html "${WEBPUB}/"

  lessc style.less > style.css
  mv style.css "${WEBPUB}/"

  pakmanager build
  rm -f pakmanaged.html
  uglifyjs pakmanaged.js > pakmanaged.min.js
  [ -z ${DEV_MODE} ] || cp pakmanaged.min.js pakmanaged.js
  mv pakmanaged.* "${WEBPUB}"
popd

