#!/bin/bash

SCRIPT=`which "$0"`
SCRIPT_DIR=`dirname "$SCRIPT"`

TMP_DIR=tmp
mkdir -p "$TMP_DIR"

ORIENTDB_ROOT=bin/orientdb
if [ `which curl` == "" ]
then
    echo "Could not find curl. Please install it and try again." 2>&1
    exit 10
fi

ORIENTDB_VERSION=`curl --silent https://oss.sonatype.org/content/repositories/releases/com/orientechnologies/orientdb/maven-metadata.xml | grep "release" | cut -d ">" -f 2 | cut -d "<" -f 1`
# uncomment this to block the installation to a fixed OrientDB version
#ORIENTDB_VERSION=1.1.0
if [ -z "$ORIENTDB_VERSION" ]
then
    echo "Could not determine the latest OrientDB version. Aborting!" 2>&1
    exit 1
fi
ORIENTDB_ROOT_USER=root
ORIENTDB_MONO_SQL=mono.sql
ORIENTDB_MONO_DROP_SQL=mono_drop.sql

function download_orientdb {

    ORIENTDB_ARCHIVE=orientdb-graphed-$ORIENTDB_VERSION.tar.gz
    if [ -e "$TMP_DIR/$ORIENTDB_ARCHIVE" ]
    then
        echo "Found OrientDB release archive: $TMP_DIR/$ORIENTDB_ARCHIVE"
    else
        echo "Trying to download OrientDB release: $ORIENTDB_ARCHIVE"
        ORIENTDB_ARCHIVE_LOCATION=http://orient.googlecode.com/files/
        echo "From location: $ORIENTDB_ARCHIVE_LOCATION"

        curl -o "$TMP_DIR/$ORIENTDB_ARCHIVE" "http://orient.googlecode.com/files/$ORIENTDB_ARCHIVE" --silent
    fi

    echo "Removing old OrientDB installation..."
    rm -Rf "$ORIENTDB_ROOT"

    mkdir -p bin

    echo "Unpacking OrientDB in: bin"

    pushd bin > /dev/null
    tar -xzf ../"$TMP_DIR/$ORIENTDB_ARCHIVE"
    popd > /dev/null

    mv "bin/orientdb-graphed-$ORIENTDB_VERSION" "$ORIENTDB_ROOT"
}


function install_orientdb {

    if [ -e "$ORIENTDB_ROOT/bin/console.sh" ]
    then
        ORIENTDB_INSTALLED_VERSION=`grep "VERSION" bin/orientdb/history.txt -m 1 | cut -d " " -f 2`
        echo "Found OrientDB (version $ORIENTDB_INSTALLED_VERSION) in: $ORIENTDB_ROOT"

        if [ "$ORIENTDB_INSTALLED_VERSION" == "$ORIENTDB_VERSION" ]
        then
            echo "Keeping the found OrientDB installation: $ORIENTDB_VERSION"
        else
            echo "Updating the OrientDB installation: $ORIENTDB_VERSION"
            download_orientdb
        fi
    else
        echo "Installing OrientDB in: $ORIENTDB_ROOT"
        download_orientdb
    fi

    # only if orient server not already running
    ORIENT_PROCESS=$(ps aux | grep "com.orientechnologies.orient.server" | grep -v grep)
    if [ -z "$ORIENT_PROCESS" ]
    then
        echo "Starting OrientDB server..."
        # start OrientDB to make sure the root user and password are generated
        TMP_CUR_DIR=`pwd`
        
        cd "$ORIENTDB_ROOT/bin/"
        ./server.sh > /dev/null 2>&1 &
        cd "$TMP_CUR_DIR"
        ORIENTDB_KILL=true
    fi

    # waiting until the server starts (max 20 seconds)
    x=0
    SECS=20
    while [ $x -lt $SECS ]
    do
        echo "Waiting for the OrientDB server to start..."
        SERVER_PID=`lsof -iTCP:2424 -sTCP:LISTEN -t`
        if [ "$SERVER_PID" != "" ]
        then
            echo "Hearing OrientDB server!"
            echo "But waiting a few more seconds until the server generates the root password..."
            sleep 5
            break
        fi
        sleep 1
        x=$(( $x + 1 ))
    done

    if [ $x -eq $SECS ]
    then
        echo "Could not start the OrientDB server. Try again or do this shit manually."
        echo "Aborting!"
        exit 1
    fi

    ORIENTDB_ROOT_PASSWORD=`grep "name=\"$ORIENTDB_ROOT_USER\"" $ORIENTDB_ROOT/config/orientdb-server-config.xml | cut -d \" -f 4`
    if [ -z "$ORIENTDB_ROOT_PASSWORD" ]
    then
        echo "Could not determine the OrientDB server root password."
        echo "Aborting!"
        exit 2
    fi

    echo "Configuring OrientDB mono SQL file: $SCRIPT_DIR/$ORIENTDB_MONO_SQL"
    sed -e "s/@ORIENTDB_ROOT_PASSWORD@/$ORIENTDB_ROOT_PASSWORD/" "$SCRIPT_DIR/$ORIENTDB_MONO_SQL" > "$TMP_DIR/$ORIENTDB_MONO_SQL"

    IMPORT_LOG=$TMP_DIR/$ORIENTDB_MONO_SQL.log
    ORIENTDB_MONO_DB_DIR=$ORIENTDB_ROOT/databases/mono
    if [ -d "$ORIENTDB_MONO_DB_DIR" ]
    then
        echo "Dropping existing mono database from: $ORIENTDB_MONO_DB_DIR"

        echo "Configuring OrientDB mono drop SQL file: $SCRIPT_DIR/$ORIENTDB_MONO_DROP_SQL"
        sed -e "s/@ORIENTDB_ROOT_PASSWORD@/$ORIENTDB_ROOT_PASSWORD/" "$SCRIPT_DIR/$ORIENTDB_MONO_DROP_SQL" > "$TMP_DIR/$ORIENTDB_MONO_DROP_SQL"

        $ORIENTDB_ROOT/bin/console.sh "$TMP_DIR/$ORIENTDB_MONO_DROP_SQL" &> /dev/null
        # TODO On Ubuntu DROP DATABASE only works when called a 2nd time
        # see issue: http://code.google.com/p/orient/issues/detail?id=1044
        DROPPING=true
        if [ `uname` != "Darwin" ]
        then
            "$ORIENTDB_ROOT/bin/console.sh" "$TMP_DIR/$ORIENTDB_MONO_DROP_SQL" &> "$IMPORT_LOG"
        fi
    fi

    if [ -d "$ORIENTDB_MONO_DB_DIR" ]
    then
        echo "Failed to properly drop mono database from: $ORIENTDB_MONO_DB_DIR"
        exit 2
    fi

    echo "Installing the OrientDB database from: $TMP_DIR/$ORIENTDB_MONO_SQL"
    $ORIENTDB_ROOT/bin/console.sh "$TMP_DIR/$ORIENTDB_MONO_SQL" &> /dev/null
    # TODO On Ubuntu CREATE DATABASE only works when called a 2nd time
    # see issue: http://code.google.com/p/orient/issues/detail?id=1044
    if [ `uname` != "Darwin" -a "$DROPPING" != "true" ]
    then
        "$ORIENTDB_ROOT/bin/console.sh" "$TMP_DIR/$ORIENTDB_MONO_SQL" &> "$IMPORT_LOG"
    fi

    # TODO Whu doesn't console return non-zero on error?
    if [ $? -eq 0 ]
    then
        echo ""
        echo "Database imported successfully."
        echo "Database import log written to: $IMPORT_LOG"
    else
        echo "Database imported FAILED!"
        cat "$IMPORT_LOG"
    fi

}

install_orientdb

