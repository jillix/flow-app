#!/bin/bash


if [ "$1" = "" ]
then
    echo "Please provide the instance ID and an optional size in GB." 1>&2
    exit 1
fi

instanceid=$1
size=20

if [ "$2" != "" ]
then
    size=$2
fi

if [ "$size" = "" ]
then
    # TODO make sure size is a number
    echo "Invalid size. Please provide a number." 1>&2
    exit 2
fi

oldvolumeid=$(ec2-describe-instances $instanceid | egrep "^BLOCKDEVICE./dev/sda1" | cut -f3)
zone=$(ec2-describe-instances $instanceid | egrep ^INSTANCE | cut -f12)
echo "instance $instanceid in $zone with original volume $oldvolumeid"

echo "*** Stopping instance..."
ec2-stop-instances $instanceid

echo "*** Detaching volume..."
while ! ec2-detach-volume $oldvolumeid 2>&1 | grep -q ATTACHMENT ; do sleep 1; done

echo "*** Creating volume snapshop..."
snapshotid=$(ec2-create-snapshot $oldvolumeid | cut -f2)
while ec2-describe-snapshots $snapshotid | grep -q pending; do sleep 1; done
echo "snapshot: $snapshotid"

echo "*** Creating new volume..."
newvolumeid=$(ec2-create-volume   --availability-zone $zone   --size $size   --snapshot $snapshotid | cut -f2)
echo "new volume: $newvolumeid"

echo "*** Attaching new volume..."
ec2-attach-volume   --instance $instanceid   --device /dev/sda1   $newvolumeid
while ! ec2-describe-volumes $newvolumeid | grep -q attached; do sleep 1; done

echo "*** Starting the instance..."
ec2-start-instances $instanceid
while ! ec2-describe-instances $instanceid | grep -q running; do sleep 1; done

echo "*** Deleting the old volume..."
ec2-delete-volume $oldvolumeid

echo "*** Deleting the volume snapshot..."
ec2-delete-snapshot $snapshotid


instancepublicdns=$(ec2-describe-instances $instanceid | egrep "^INSTANCE" | cut -f4)

echo ""
echo "****************************************"
echo "The instance can be now reached at:"
echo "    ssh -A ubuntu@$instancepublicdns"
echo ""
echo "You might need to run the following commands on the instance"
echo "    sudo resize2fs /dev/xvda1"
echo ""
echo "To check the size of your root device on the instance, run:"
echo "    df -h /"
echo "****************************************"
echo ""

