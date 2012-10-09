#!/bin/bash

if [ "$MONO_ROOT" == "" ]
then
    echo "Please set the MONO_ROOT environment variable" 1>&2
    exit 10
fi

cd "$MONO_ROOT"

APP_FILE_ARG=$1

function ce {
    if [ $? -ne 0 ]
    then
        if [ "$1" != "" ]
        then
            echo "$1"
        fi
        rm -f "$APP_FILE_ARG"
        exit 1
    fi
}

if [ ! -f "$APP_FILE_ARG" ]
then
    echo "Missing application archive" 1>&2
    exit 1
fi

TMP_APP_DIR=`mktemp -d "$MONO_ROOT/apps/tmp/XXXXXX" 2> /dev/null`
ce "Failed to create application temporary directory"

# unzip application archive in mono apps
unzip "$APP_FILE_ARG" -d "$TMP_APP_DIR" > /dev/null
ce "Could not unarchive the application archive."

# delete archive
rm "$APP_FILE_ARG"

# read descriptos file
APP_ID=`node -e "console.log(require('$TMP_APP_DIR/mono.json').appId)" 2> /dev/null`
ce "Could not determine the application ID."

APP_DESCRIPTOR=$MONO_ROOT/apps/$APP_ID/mono.json

# clean up if already installed
if [ -e "$MONO_ROOT/apps/$APP_ID" ]
then
    # stop application node
    "$MONO_ROOT/admin/scripts/installation/stop_app.sh" "$APP_ID"

    # uninstall the application
    node "$MONO_ROOT/admin/scripts/installation/uninstall_app.js" "$APP_DESCRIPTOR"
    #ce "Could not uninstall application: $APP_ID"

    # and remove the application directory
    rm -Rf "$MONO_ROOT/apps/$APP_ID"
    ce "Could not cleanup already existing application: $APP_ID"
fi

# move the app to the app ID directory
mv "$TMP_APP_DIR" "$MONO_ROOT/apps/$APP_ID"
ce "Could not move application to propper location: $APP_ID"

# install the new application
node "$MONO_ROOT/admin/scripts/installation/install_app.js" "$APP_DESCRIPTOR"
ce "Could not install application: $APP_ID"

echo "Succesfully deployed application $APP_ID"

