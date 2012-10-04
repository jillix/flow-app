#!/bin/bash

if [ -z "$1" ]
then
    echo "Missing application id" 1>&2
    exit 2
fi

if [ "${#1}" != "32" ]
then
    # TODO make sure $1 is not something else that what we are expecting (code injection)
    echo "Invalid application id: $1" 1>&2
    exit 3
fi

# find out if the application is already running
APP_PID=`ps aux | grep "server.js --app $1" | grep -v grep | awk '{print $2}'`
if [ -z "$APP_PID" ]
then
    echo "Application $1 is not running" 1>&2
    exit 1
fi

echo "$APP_PID"

