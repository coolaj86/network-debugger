#!/usr/bin/env bash

DEV_MODE=${DEV_MODE}

set -e
set -u

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
  if [ -z ${DEV_MODE} ]; then
    uglifyjs pakmanaged.js > pakmanaged.min.js
    mv pakmanaged.min.js pakmanaged.js
  fi
  mv pakmanaged.js "${WEBPUB}"
popd

