#!/bin/bash

if [ ! -z "$1" ]
then
    MACHINE_NAME=$1
fi

if [ -z "$MACHINE_NAME" ]
then
    echo "Please provide a machine name. This will be the directory in the backup bucket on S3." 1>&2
    exit 1
fi

MONO_USER=mono

# backup MongoDB
MONO_USER=$MONO_USER /home/$MONO_USER/mono/admin/scripts/backup/backup_mongo.sh "$MACHINE_NAME"

# backup images
MONO_USER=$MONO_USER /home/$MONO_USER/mono/admin/scripts/backup/backup_images.sh "$MACHINE_NAME"

