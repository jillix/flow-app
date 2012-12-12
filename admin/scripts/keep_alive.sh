#!/bin/bash

#
# This script makes sure that mono and the deployer run, and if not,
# it will start them in their screens (mono and deploy)
#

MONO_PID=`lsof -iTCP:8000 -sTCP:LISTEN -t`
MONO_SCREEN_NAME=mono
MONO_SERVER=~/mono/server.js
MONO_CONFIG=~/mono/conf/dev_server.json
MONO_LOG=~/logs/mono.log

ORIENT_PID=`lsof -iTCP:2424 -sTCP:LISTEN -t`
ORIENT_SCREEN_NAME=orient
ORIENT_SERVER="cd ~/mono/bin/orientdb/bin; ./server.sh"
ORIENT_LOG=~/logs/orient.log


# this spawner is needed because the first screen is not stuffable
HAS_SPAWNER=`screen -ls | grep "\.spawner"`
if [ -z "$HAS_SPAWNER" ]
then
    screen -d -m -S spawner
fi


new_line() {
    HAS_SCREEN=`screen -ls | grep "\.$1"`
    if [ ! -z "$HAS_SCREEN" ]
    then
        screen -S $1 -X stuff $'\n'
    fi
}

check_screen() {
    HAS_SCREEN=`screen -ls | grep "\.$1"`
    if [ -z "$HAS_SCREEN" ]
    then
        # start the screen using a spawner screen
        screen -S spawner -X screen screen -dR $1
        sleep 1 # may be necessary
        screen -S $1 -X detach

        ## now give it a color
        #if [ "$1" == "mono" ]
        #then
        #    NEW_PS1='${debian_chroot:+($debian_chroot)}\[\033[01;36m\]\u@\h\[\033[00m\]:\w\$ \[\e[1;36m\]'
        #elif [ "$1" == "deploy" ]
        #then
        #    NEW_PS1='${debian_chroot:+($debian_chroot)}\[\033[01;35m\]\u@\h\[\033[00m\]:\w\$ \[\e[1;35m\]'
        #elif [ "$1" == "orient" ]
        #then
        #    NEW_PS1='\[\033[01;35m\]\u@\h\[\033[00m\]:\w$ \[\e[1;33m\]'
        #else
        #    NEW_PS1=$PS1
        #fi

        #screen -S $1 -X stuff "PS1='$NEW_PS1'"
        #new_line $1
    fi
}

# params: screen_name executable log params
execute_in_screen() {
    check_screen $1
    COMMAND=`echo -e "node \"$2\" $4 &>> $3\n"`
    if [ "$1" == "$ORIENT_SCREEN_NAME" ]
    then
        COMMAND=`echo -e "$2 &>> $3\n"`
    fi
    screen -S $1 -X stuff "$COMMAND"
    new_line $1
}


# make sure we have the logs directory
mkdir -p ~/logs

if [ -z "$MONO_PID" ]
then
    if [ "$MONO_CONFIG" != "" ]
    then
        MONO_PARAMS="--config \"$MONO_CONFIG\""
    fi
    execute_in_screen "$MONO_SCREEN_NAME" "$MONO_SERVER" "$MONO_LOG" "$MONO_PARAMS"
fi

if [ -z "$ORIENT_PID" ]
then
    execute_in_screen "$ORIENT_SCREEN_NAME" "$ORIENT_SERVER" "$ORIENT_LOG"
fi

