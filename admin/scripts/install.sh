#!/bin/bash

MONO_ROOT=`pwd`

# install OrientDB and mono database
#$MONO_ROOT/admin/scripts/orientdb/install.sh

# configure mono
node $MONO_ROOT/admin/scripts/installation/init_submodules.js

