#!/bin/bash

# read the application ID prefix if not provided as the first parameter
if [ -z $1 ]
then
    read -p "Application: " APP
else
    APP_PREFIX=$1
fi

# how many applications can I find with this pattern: --app $APP_PREFIX
RESULT_COUNT=`ps aux | grep node | grep -c "\-\-app $APP_PREFIX"`
# 0 is too few
if [ $RESULT_COUNT -lt 1 ]
then
    echo "I could not find an application having the ID starting with: $APP_PREFIX" 1>&2
    exit 1
fi
# more than 1 is too much
if [ $RESULT_COUNT -gt 1 ]
then
    echo "I could not uniquely identify an app having the ID starting with: $APP_PREFIX" 1>&2
    exit 1
fi

# get the process command line parameters
ARGS=`ps aux | grep node | grep "\-\-app $APP_PREFIX" | awk '{ split($0, s, / node /); print s[2] }'`

# kill the app and start it in debug mode
if [ "$ARGS" ]
then
    kill `ps aux | grep node | grep "\-\-app $APP_PREFIX" | awk '{ print $2 }'`
    `echo "node debug $ARGS"`
fi

