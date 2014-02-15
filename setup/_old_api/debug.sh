#!/bin/bash

if [ "$1" != "" ]
then
    LAUNCH=$1
fi

ps ax | grep "node lib/proxy/server.js" | grep -v grep | awk '{print $1}' | xargs kill
ps ax | grep "node-inspector" | grep -v grep | awk '{print $1}' | xargs kill

node server.js &

ps ax | grep "node server.js" | grep -v grep | awk '{print $1}' | xargs kill -s USR1

node-inspector > /dev/null &

sleep 1

open http://127.0.0.1:8080/debug?port=5858

sleep 1

if [ "$LAUNCH" ]
then
    open $LAUNCH
fi

