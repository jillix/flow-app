#!/bin/bash

function ce {
    if [ $? -ne 0 ]
    then
        echo "$1"
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

if [ ! -f "$APP_DIR/mono.json" ]
then
    echo "I cannot find the mono.json app descriptor in the current directory. You must call this script from an an application directory" 1>&2
    exit 4
fi

# read descriptos file
APP_ID=`node -e "console.log(require('$APP_DIR/mono.json').appId)" 2> /dev/null`
ce "Could not determine the application ID." 5

# TODO add a -f (force) argument that will allow removal of existing deployed applications

# uninstall the app if this is already deployed
if [ -d "$MONO_ROOT/apps/$APP_ID" ]
then
    echo "*** Uninstalling already deployed app: $APP_ID"
    pushd "$MONO_ROOT" > /dev/null
    node "$MONO_ROOT/admin/scripts/installation/uninstall_app.js" "$MONO_ROOT/apps/$APP_ID/mono.json"
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
node "$MONO_ROOT/admin/scripts/installation/install_app.js" "$MONO_ROOT/apps/$APP_ID/mono.json"
popd > /dev/null


exit






if [ -e "$MONO_ROOT/apps/$APP_ID" ]
then
    echo "I cannot find the mono.json app descriptor in the current directory. You must call this script from an an application directory" 1>&2
    exit 3
fi

echo $APP_ID
exit

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

