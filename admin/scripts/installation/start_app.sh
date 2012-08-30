#!/bin/bash

MONO_ROOT=~/mono

if [ -z "$1" ]
then
    echo "Missing application id" 1>&2
    exit 1
fi

# TODO compute realpath
if [ ! -d "$MONO_ROOT/apps/$1" ]
then
    echo "Application $1 is not installed" 1>&2
    exit 2
fi

# find out if the application is already running
# TODO this is a possible vulnerability of one tries to kill other apps using . navigation
APP_PID=`ps aux | grep "node $MONO_ROOT/server.js --app $1" | grep -v grep | awk '{print $2}'`
if [ ! -z "$APP_PID" ]
then
    echo "Application $1 seems to be running already: $APP_PID" 1>&2
    exit 3
fi

# noe start the application node
node $MONO_ROOT/server.js --app "$1" &

