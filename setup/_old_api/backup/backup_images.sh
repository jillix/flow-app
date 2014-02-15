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

if [ -z "$MONO_USER" ]
then
    echo "Missing mono user account. Please set MONO_USER." 1>&2
    exit 2
fi

IMAGE_DIR=/home/$MONO_USER/images

if [ ! -d "$IMAGE_DIR" ]
then
    echo "Could not find the image directory: $IMAGE_DIR" 1>&2
    exit 3
fi

DATE=`date +%Y%m%d_%H%M%S`
ZIP_NAME=${DATE}_images.zip

mkdir -p ~/backups

# archive the image directory
zip -r ~/backups/"$ZIP_NAME" "$IMAGE_DIR"/ > /dev/null

# delete the old backups
find ~/backups/ -type f -name "*_images.zip" -mtime +7 | xargs rm -f

# copy the dump to S3
s3cmd --delete-removed --no-progress --include=*_images.zip sync ~/backups/ "s3://backup.jillix/$MACHINE_NAME/" > /dev/null

