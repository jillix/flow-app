#!/bin/bash

#
# This script makes sure that mono and the deployer run, and if not,
# it will start them in their screens (mono and deploy)
#


MONO_PID=`lsof -iTCP:8000 -sTCP:LISTEN -t`
DEPLOYER_PID=`ps aux | grep "blueimp-file-upload-node/server.js" | grep -v grep | awk '{print $2}'`

if [ -z "$MONO_PID" ]
then
    screen -S mono -X stuff $'node ~/mono/server.js 2>> ~/logs/mono.log >> ~/logs/mono.log\n'
fi

if [ -z "$DEPLOYER_PID" ]
then
    screen -S deploy -X stuff $'node ~/mono/admin/temp_deploy_app/node_modules/blueimp-file-upload-node/server.js 2>> ~/logs/deploy.log >> ~/logs/deploy.log\n'
fi


