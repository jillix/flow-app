#!/bin/bash


SCRIPT=`which $0`
SCRIPT_DIR=`dirname $SCRIPT`

ORIENTDB_ROOT=bin/orientdb
ORIENTDB_VERSION=`curl --silent http://www.orientechnologies.com/listing/m2/com/orientechnologies/orientdb-graphdb/maven-metadata.xml | grep "release" | cut -d ">" -f 2 | cut -d "<" -f 1`


function download_orientdb {

    ORIENTDB_ARCHIVE=orientdb-graphed-$ORIENTDB_VERSION.zip
    if [ -e "$ORIENTDB_ARCHIVE" ]
    then
        echo "Found OrientDB release: $ORIENTDB_ARCHIVE"
    else
        echo "Trying to download OrientDB release: $ORIENTDB_ARCHIVE"
        ORIENTDB_ARCHIVE_LOCATION=http://orient.googlecode.com/files/
        echo "From location: $ORIENTDB_ARCHIVE_LOCATION"

        curl -O http://orient.googlecode.com/files/$ORIENTDB_ARCHIVE --silent
    fi

    echo "Unpacking OrientDB in: $ORIENTDB_ROOT"
    unzip -o -q -d $ORIENTDB_ROOT $ORIENTDB_ARCHIVE
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

    ORIENTDB_ROOT_USER=root
    ORIENTDB_ROOT_PASSWORD=`grep "name=\"$ORIENTDB_ROOT_USER\"" $ORIENTDB_ROOT/config/orientdb-server-config.xml | cut -d \" -f 4`

    ORIENTDB_MONO_SQL=mono.sql
    echo "Installing the OrientDB database from: $ORIENTDB_MONO_SQL"

    $ORIENTDB_ROOT/bin/console.sh $SCRIPT_DIR/mono.sql
}


install_orientdb

