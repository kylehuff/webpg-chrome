#!/bin/bash
# Build config for build.sh
VERSION=`sed -n 's/.*em\:version\=\"\(.*\)\"/\1/p' install.rdf`
APP_NAME=webpg-firefox-v${VERSION}
CHROME_PROVIDERS="../extension"
CREATE_JAR=0
CLEAN_UP=1
ROOT_FILES="../AUTHORS ../COPYING"
ROOT_DIRS="defaults locale"
BEFORE_BUILD="rm -rf ../extension/META-INF"
#AFTER_BUILD="xpisign -f -k ~/.ssl/codesigning.pem output/${APP_NAME}.xpi output/${APP_NAME}_s.xpi && firefox output/${APP_NAME}_s.xpi"
AFTER_BUILD="firefox output/${APP_NAME}.xpi"
