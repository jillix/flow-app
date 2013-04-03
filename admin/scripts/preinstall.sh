#!/bin/bash

MONO_ROOT=`pwd`
ORIENTDB_PORT=2424

# remove module cache
rm -Rf "$MONO_ROOT"/modules/*
# remove installed application
rm -Rf "$MONO_ROOT"/apps/0*

# if orient is not started yet, this will start it, so we have to shut it down at the end
ORIENTDB_PROCESS_PID=`lsof -iTCP:$ORIENTDB_PORT -sTCP:LISTEN -t`
if [ -z "$ORIENTDB_PROCESS_PID" ]
then
    ORIENTDB_PROCESS_KILL=true
fi

# install OrientDB and mono database
"$MONO_ROOT/admin/scripts/orientdb/install.sh"
if [ $? -gt 0 ]
then
    exit 1
fi

