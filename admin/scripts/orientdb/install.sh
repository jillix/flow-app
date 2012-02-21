#!/bin/bash


SCRIPT=`which $0`
SCRIPT_DIR=`dirname $SCRIPT`

TMP_DIR=tmp

ORIENTDB_ROOT=bin/orientdb
ORIENTDB_VERSION=`curl --silent http://www.orientechnologies.com/listing/m2/com/orientechnologies/orientdb-graphdb/maven-metadata.xml | grep "release" | cut -d ">" -f 2 | cut -d "<" -f 1`
ORIENTDB_ROOT_USER=root
ORIENTDB_MONO_SQL=mono.sql


function download_orientdb {

    ORIENTDB_ARCHIVE=orientdb-graphed-$ORIENTDB_VERSION.zip
    if [ -e "$TMP_DIR/$ORIENTDB_ARCHIVE" ]
    then
        echo "Found OrientDB release archive: $TMP_DIR/$ORIENTDB_ARCHIVE"
    else
        echo "Trying to download OrientDB release: $ORIENTDB_ARCHIVE"
        ORIENTDB_ARCHIVE_LOCATION=http://orient.googlecode.com/files/
        echo "From location: $ORIENTDB_ARCHIVE_LOCATION"

        curl -o "$TMP_DIR/$ORIENTDB_ARCHIVE" "http://orient.googlecode.com/files/$ORIENTDB_ARCHIVE" --silent
    fi

    echo "Unpacking OrientDB in: $ORIENTDB_ROOT"
    unzip -o -q -d "$ORIENTDB_ROOT" "$TMP_DIR/$ORIENTDB_ARCHIVE"
    chmod +x bin/orientdb/bin/*sh
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
            ORIENTDB_VERSION=$ORIENTDB_INSTALLED_VERSION
            echo "Updating the OrientDB installation: $ORIENTDB_VERSION"
            download_orientdb
        fi
    else
        echo "Installing OrientDB in: $ORIENTDB_ROOT"
        rm -Rf $ORIENTDB_ROOT
        mkdir $ORIENTDB_ROOT
        download_orientdb
    fi

    # TODO only if not already running
    # start OrientDB to make sure the root user and password are generated
    TMP_CUR_DIR=`pwd`
    cd "$ORIENTDB_ROOT/bin/"
    ./server.sh > /dev/null 2>&1 &
    cd "$TMP_CUR_DIR"

    # wait for the server to start
    sleep 2

    ORIENTDB_ROOT_PASSWORD=`grep "name=\"$ORIENTDB_ROOT_USER\"" $ORIENTDB_ROOT/config/orientdb-server-config.xml | cut -d \" -f 4`

    echo "Configuring OrientDB mono SQL file: $SCRIPT_DIR/$ORIENTDB_MONO_SQL"
    sed -e "s/@ORIENTDB_ROOT_PASSWORD@/$ORIENTDB_ROOT_PASSWORD/" "$SCRIPT_DIR/$ORIENTDB_MONO_SQL" > "$TMP_DIR/$ORIENTDB_MONO_SQL"

    echo "Installing the OrientDB database from: $TMP_DIR/$ORIENTDB_MONO_SQL"
    IMPORT_LOG=$TMP_DIR/$ORIENTDB_MONO_SQL.log
    $ORIENTDB_ROOT/bin/console.sh "$TMP_DIR/$ORIENTDB_MONO_SQL" 2>&1 > "$IMPORT_LOG"
    
    # TODO Whu doesn't console return non-zero on error?
    if [ $? -eq 0 ]
    then
        echo "Database imported successfully."
        echo "Database import log written to: $IMPORT_LOG"
    else
        echo "Database imported FAILED!"
        cat "$IMPORT_LOG"
    fi

    # close now OrientDB server TODO but only if we start it above
    kill $(ps aux | grep "$ORIENTDB_ROOT" | grep -v "grep" | awk '{print $2}')
}


install_orientdb

