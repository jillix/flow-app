#!/bin/bash

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
            exit $2
        else
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

# get the absolute path to this app directory
APP_DIR=`pwd`

APP_BASENAME=`basename $APP_DIR`
if [ "$APP_DIR" == "$MONO_ROOT/apps/$APP_BASENAME" ]
then
    echo "Currently you cannot deploy application from inside the MONO_ROOT/apps directory. This is intended for applications hosted in other repositories" 1>&2
    exit 3
fi

if [ ! -f "$APP_DIR/application.json" ]
then
    echo "I cannot find the application.json app descriptor in the current directory. You must call this script from an an application directory" 1>&2
    exit 4
fi

# read descriptos file
APP_ID=`node -e "console.log(require('$APP_DIR/application.json').appId)" 2> /dev/null`
ce "Could not determine the application ID." 5

# TODO add a -f (force) argument that will allow removal of existing deployed applications

# uninstall the app if this is already deployed
if [ -d "$MONO_ROOT/apps/$APP_ID" ]
then
    echo "*** Uninstalling already deployed app: $APP_ID"
    pushd "$MONO_ROOT" > /dev/null
    node "$MONO_ROOT/admin/scripts/installation/uninstall_app.js" "$MONO_ROOT/apps/$APP_ID/application.json"
    popd > /dev/null

    # remove the old app content
    rm -rf "$MONO_ROOT/apps/$APP_ID/*"
else
    echo "*** Creating app directory: $APP_ID"
    mkdir "$MONO_ROOT/apps/$APP_ID"
fi

# copy the new content
cp -R "$APP_DIR"/* "$MONO_ROOT/apps/$APP_ID"

# install the new app
echo "*** Installing app: $APP_ID"
pushd "$MONO_ROOT" > /dev/null
node "$MONO_ROOT/admin/scripts/installation/install_app.js" "$MONO_ROOT/apps/$APP_ID/application.json"
popd > /dev/null

