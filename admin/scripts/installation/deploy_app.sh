#!/bin/bash

MONO_ROOT=~/mono
APP_FILE_ARG=$1

function ce {
    if [ $? -ne 0 ]
    then
        if [ "$1" != "" ]
        then
            echo "$1"
        fi
        rm -f $APP_FILE_ARG
        exit 1
    fi
}

if [ ! -f "$APP_FILE_ARG" ]
then
    echo "Missing application archive" 1>&2
    exit 1
fi

TMP_APP_DIR=`mktemp -d $MONO_ROOT/apps/tmp/XXXXXX 2> /dev/null`
ce "Failed to create application temporary directory"

# unzip application archive in mono apps
unzip $APP_FILE_ARG -d $TMP_APP_DIR > /dev/null
ce "Could not unarchive the application archive."

# delete archive
rm $APP_FILE_ARG

# read descriptos file
APP_ID=`node -e "console.log(require('$TMP_APP_DIR/mono.json').appId)" 2> /dev/null`
ce "Could not determine the application ID."

# move the app to the app ID directory
if [ -e "$MONO_ROOT/apps/$APP_ID" ]
then
    rm -R "$MONO_ROOT/apps/$APP_ID"
    ce "Could not cleanup already existing application: $APP_ID"
fi
mv "$TMP_APP_DIR" "$MONO_ROOT/apps/$APP_ID"
ce "Could not move application to propper location: $APP_ID"

# stop mono
MONO_PID=`lsof -iTCP:8000 -sTCP:LISTEN -t`
if [ -n "$MONO_PID" ]
then
    kill $MONO_PID
fi

# install all applications in mono
cd $MONO_ROOT
npm install
ce "Could not deploy application: $APP_ID"

# starting mono
node $MONO_ROOT/server.js &

echo "Succesfully deployed application $APP_ID"

