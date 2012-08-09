#!/bin/bash

MONO_ROOT=`pwd`
ORIENTDB_PORT=2424

# TODO temp module removal
rm -Rf $MONO_ROOT/modules/*

# if orient is not started yet, this will start it, so we have to shut it down at the end
ORIENTDB_PROCESS_PID=`lsof -iTCP:$ORIENTDB_PORT -sTCP:LISTEN -t`
if [ -z "$ORIENTDB_PROCESS_PID" ]
then
    ORIENTDB_PROCESS_KILL=true
fi

# install OrientDB and mono database
$MONO_ROOT/admin/scripts/orientdb/install.sh
if [ $? -gt 0 ]
then
    exit 1
fi

# configure mono
node $MONO_ROOT/admin/scripts/installation/init_core_apps.js

# close now OrientDB server
if [ -n "$ORIENTDB_PROCESS_KILL" ]
then
    echo "Stopping OrientDB server..."
    kill `lsof -iTCP:$ORIENTDB_PORT -sTCP:LISTEN -t`
fi

