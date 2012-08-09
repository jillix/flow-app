#!/bin/bash


SCRIPT=`which $0`
SCRIPT_DIR=`dirname $SCRIPT`

TMP_DIR=tmp
mkdir -p "$TMP_DIR"

ORIENTDB_ROOT=bin/orientdb
ORIENTDB_VERSION=`curl --silent https://oss.sonatype.org/content/repositories/releases/com/orientechnologies/orientdb/maven-metadata.xml | grep "release" | cut -d ">" -f 2 | cut -d "<" -f 1`
#ORIENTDB_VERSION=1.1.0
ORIENTDB_ROOT_USER=root
ORIENTDB_MONO_SQL=mono.sql
ORIENTDB_MONO_DROP_SQL=mono_drop.sql


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

    echo "Removing old OrientDB installation..."
    rm -Rf "$ORIENTDB_ROOT"

    mkdir -p bin

    echo "Unpacking OrientDB in: bin"
    unzip -o -q -d bin "$TMP_DIR/$ORIENTDB_ARCHIVE"

    mv "bin/orientdb-graphed-$ORIENTDB_VERSION" "$ORIENTDB_ROOT"
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

    ORIENTDB_MONO_DB_DIR=$ORIENTDB_ROOT/databases/mono
    if [ -d "$ORIENTDB_MONO_DB_DIR" ]
    then
        echo "Dropping existing mono database from: $ORIENTDB_MONO_DB_DIR"

        echo "Configuring OrientDB mono drop SQL file: $SCRIPT_DIR/$ORIENTDB_MONO_DROP_SQL"
        sed -e "s/@ORIENTDB_ROOT_PASSWORD@/$ORIENTDB_ROOT_PASSWORD/" "$SCRIPT_DIR/$ORIENTDB_MONO_DROP_SQL" > "$TMP_DIR/$ORIENTDB_MONO_DROP_SQL"

        $ORIENTDB_ROOT/bin/console.sh "$TMP_DIR/$ORIENTDB_MONO_DROP_SQL" 2>&1 > /dev/null
    fi

    echo "Installing the OrientDB database from: $TMP_DIR/$ORIENTDB_MONO_SQL"
    IMPORT_LOG=$TMP_DIR/$ORIENTDB_MONO_SQL.log
    $ORIENTDB_ROOT/bin/console.sh "$TMP_DIR/$ORIENTDB_MONO_SQL" 2>&1 > "$IMPORT_LOG"
    
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

