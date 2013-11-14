#!/bin/bash

APP=`read -p "Application: " `
ARGS=`ps aux | grep node | grep "\-\-app $APP" | awk '{ split($0, s, / node /); print s[2] }'`

if [ "$ARGS" ]
then
    kill `ps aux | grep node | grep "\-\-app $APP" | awk '{ print $2 }'`
    `echo "node debug $ARGS"`
fi

