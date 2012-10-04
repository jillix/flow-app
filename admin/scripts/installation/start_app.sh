#!/bin/bash

if [ "$MONO_ROOT" == "" ]
then
    echo "Please set the MONO_ROOT environment variable" 1>&2
    exit 10
fi

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

# find a free port
FREE_PORT=`"$MONO_ROOT/admin/scripts/installation/find_port.sh"`
if [ -z "$FREE_PORT" ]
then
    echo "Could not find a free port for starting application $1" 1>&2
    exit 4
fi

# now start the application node
node "$MONO_ROOT/server.js" --app "$1" --port "$FREE_PORT" &

