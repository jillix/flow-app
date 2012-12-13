#!/bin/bash

function cleanup {
    popd 2> /dev/null
    rm -f "$APP_FILE_ARG"
    rm -Rf "$TMP_APP_DIR"
}

function ce {
    if [ $? -ne 0 ]
    then
        # show the error message if one is provided
        if [ "$1" != "" ]
        then
            echo "$1" 1>&2
        fi
        # if an error is provided, exit with it
        if [ $2 != "" ]
        then
            cleanup
            exit $2
        else
            cleanup
            exit 99
        fi
    fi
}

# MONO_ROOT must be provided
if [ "$MONO_ROOT" == "" ]
then
    echo "Please set the MONO_ROOT environment variable" 1>&2
    exit 1
fi

# MONO_ROOT must be a directory and contain the apps directory
if [ ! -d "$MONO_ROOT" -o ! -d "$MONO_ROOT/apps" ]
then
    echo "MONO_ROOT must point to the mono root directory" 1>&2
    exit 2
fi

# get the absolute path to mono root
pushd "$MONO_ROOT" > /dev/null
MONO_ROOT=`pwd`
popd > /dev/null

APP_FILE_ARG=$1

if [ ! -f "$APP_FILE_ARG" ]
then
    echo "Missing application archive" 1>&2
    exit 3
fi

TMP_APP_DIR=`mktemp -d "$MONO_ROOT/apps/tmp/XXXXXX" 2> /dev/null`
ce "Failed to create application temporary directory" 4

# unzip application archive in mono apps
unzip "$APP_FILE_ARG" -d "$TMP_APP_DIR" > /dev/null
ce "Could not unarchive the application archive." 5

NEW_APP_DESCRIPTOR="$TMP_APP_DIR/mono.json"
# is the mono.json file is not in the archive root, assume we have a single directory
if [ ! -f "$NEW_APP_DESCRIPTOR" ]
then
    pushd $TMP_APP_DIR > /dev/null
    # get the first item in the directory
    FILES=(*)
    DIR=${FILES[@]:0:1}
    if [ ! -f "$DIR/mono.json" ]
    then
        echo "Could not find the application descriptor. This must be either in the archive root or in the single directory in this archive." 1>&2
        popd > /dev/null
        cleanup
        exit 6
    fi
    popd > /dev/null
    NEW_APP_DESCRIPTOR="$TMP_APP_DIR/$DIR/mono.json"
fi

# read descriptos file
APP_ID=`node -e "console.log(require('$NEW_APP_DESCRIPTOR').appId)" 2> /dev/null`
ce "Could not determine the application ID." 7

APP_DESCRIPTOR="$MONO_ROOT/apps/$APP_ID/mono.json"

# clean up if already installed
if [ -e "$MONO_ROOT/apps/$APP_ID" ]
then
    # stop application node
    "$MONO_ROOT/admin/scripts/installation/stop_app.sh" "$APP_ID"

    pushd "$MONO_ROOT" > /dev/null
    # uninstall the application
    node "$MONO_ROOT/admin/scripts/installation/uninstall_app.js" "$APP_DESCRIPTOR"
    #ce "Could not uninstall application: $APP_ID"
    popd > /dev/null

    # and remove the old application directory
    rm -Rf "$MONO_ROOT/apps/$APP_ID"
    ce "Could not cleanup already existing application: $APP_ID" 8
fi

# move the app to the app ID directory
NEW_APP_DIR=`dirname $NEW_APP_DESCRIPTOR`
mv "$NEW_APP_DIR" "$MONO_ROOT/apps/$APP_ID"
ce "Could not move application to propper location: $APP_ID" 9

pushd "$MONO_ROOT" > /dev/null
# install the new application
node "$MONO_ROOT/admin/scripts/installation/install_app.js" "$APP_DESCRIPTOR"
ce "Could not install application: $APP_ID" 10
popd > /dev/null

cleanup
echo "Succesfully deployed application $APP_ID"

