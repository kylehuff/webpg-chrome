#!/bin/bash
# Build config for build.sh
VERSION=`sed -n 's/.*em\:version\=\"\(.*\)\"/\1/p' install.rdf`
APP_NAME=webpg-firefox-v${VERSION}
CHROME_PROVIDERS="extension locale extension/skin"
CREATE_JAR=0
CLEAN_UP=0
ROOT_FILES="../AUTHORS ../COPYING"
ROOT_DIRS="defaults"
BEFORE_BUILD="rm -rf extension/META-INF"
#AFTER_BUILD="xpisign -f -k /home/kylehuff/.ssl/codesigning.pem ${APP_NAME}.xpi ${APP_NAME}_s.xpi && firefox ${APP_NAME}_s.xpi"
AFTER_BUILD="firefox ${APP_NAME}.xpi"
