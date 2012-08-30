#!/bin/bash

MONO_ROOT=~/Work/mono

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

# find the app PID
# TODO this is a possible vulnerability of one tries to kill other apps using . navigation
APP_PID=`ps aux | grep "node $MONO_ROOT/server.js --app $1" | grep -v grep | awk '{print $2}'`
if [ -z "$APP_PID" ]
then
    exit
fi

# now kill the application node
echo "Stopping application $1 with pid $APP_PID"
kill $APP_PID

