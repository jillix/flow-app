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

DATE=`date +%Y%m%d_%H%M%S`
TMP_DIR=backup_$DATE
ZIP_NAME=${DATE}_mongo.zip

mkdir -p ~/backups
mkdir "$TMP_DIR"

#mongodump -d mono -o "$TMP_DIR"

# export liqshop
mongodump -d liqshop -o "$TMP_DIR" > /dev/null

# export sag
mongodump -d sag -o "$TMP_DIR" > /dev/null

# export sag-shops
mongodump -d sag-shops -o "$TMP_DIR" > /dev/null

# export survey
mongodump -d survey -o "$TMP_DIR" > /dev/null

# archive the dump
zip -r "$TMP_DIR/$ZIP_NAME" "$TMP_DIR"/* > /dev/null

# move this backup to the backups directory
mv "$TMP_DIR/$ZIP_NAME" ~/backups/

# delete the old backups
find ~/backups/ -type f -name "*_mongo.zip" -mtime +7 | xargs rm -f

# copy the dump to S3
s3cmd --delete-removed --no-progress --include=*_mongo.zip sync ~/backups/ "s3://backup.jillix/$MACHINE_NAME/" > /dev/null

# cleanup
rm -R "$TMP_DIR"

