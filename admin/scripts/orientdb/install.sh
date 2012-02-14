#!/bin/bash

SCRIPT=`which $0`
SCRIPT_DIR=`dirname $SCRIPT`


ORIENTDB_ROOT=/Users/gabriel/Work/orientdb/
ORIENTDB_ROOT_USER=root
ORIENTDB_ROOT_PASSWORD=`grep "name=\"$ORIENTDB_ROOT_USER\"" $ORIENTDB_ROOT/config/orientdb-server-config.xml | cut -d \" -f 4`


echo "Installing the OrientDB database..."

$ORIENTDB_ROOT/bin/console.sh $SCRIPT_DIR/mono.sql

