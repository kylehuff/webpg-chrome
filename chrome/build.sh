#!/bin/bash -e

# uncomment for debug
#set -x

args=("$@")

VERSION=$(sed -nr '/"version"/s:.*"(.*)",$:\1:p' ../extension/manifest.json)

if [ "$1" = "devel" ]; then
    KEY="webpg-chrome-devel"
    NAME=$KEY
    sed -ri 's/(\.)([0-9]+)/echo \1$((\2+1))/ge' current_build
    BUILD_NO=$(cat current_build)
    sed -ri "s/^(\s*\"version\":\s*)\"(.*)\",$/\1\"\2$BUILD_NO\",/g" ../extension/manifest.json
else
    KEY="extension"
    NAME="webpg-chrome-v$VERSION"
fi

if [ ! -d "output" ]; then
    mkdir output;
fi

if [ -f "output/$NAME.zip" ]; then
    rm output/$NAME.zip
fi

pushd ../$KEY
zip -r ../chrome/output/$NAME.zip . -x "*XULContent*"
popd

sed -ri "s/^(\s*\"version\":\s*)\"(.*)\",$/\1\"$VERSION\",/g" ../extension/manifest.json
buildcrx output/$NAME.zip $KEY.pem output/$NAME.crx
