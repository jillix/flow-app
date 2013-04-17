#!/bin/bash

USERNAME=mono
ADMINNAME=$SUDO_USER

# Old Machine 14
OLD_SOURCE_USERNAME=webadmin
OLD_SOURCE_SERVER=machine14.abc4it.com
# this adds the machine 14 to the known hosts
echo exit | sudo -E -u ubuntu ssh -T -o StrictHostKeyChecking=no webadmin@machine14.abc4it.com

# AWS Micro Instance
SOURCE_USERNAME=ubuntu
SOURCE_SERVER=ip-10-229-30-51.eu-west-1.compute.internal

if [ "$1" = "-n" ]
then
    NO_DATA=true
fi

if [ "$1" = "-c" ]
then
    COMPLETE=$1
fi


function checks {

    if [ "$ADMINNAME" = "" ]
    then
        echo "This script must be run as super user. Use:" 1>&2
        echo "    sudo -E $0" 1>&2
        exit 1
    fi

    if [ "$SSH_AUTH_SOCK" = "" ]
    then
        echo "In order to access git repos you must enable SSH Agent Forwarding." 1>&2
        echo "For this you must:" 1>&2
        echo "    - connect to this server using the ssh -A option and" 1>&2
        echo "    - run this script with sudo -E option to preserve the environement variables" 1>&2
        exit 2
    fi

}

function install {

    if [ "$1" = "" ]
    then
        echo "install called with no arguments." 1>&2
        echo "Aborting!" 1>&2
        exit 3
    fi

    PACKAGE=$1
    EXECUTABLE=$2
    if [ "$EXECUTABLE" = "" ]
    then
        EXECUTABLE=$PACKAGE
    fi

    EXEC=`which $EXECUTABLE`
    if [ "$EXEC" = "" ]
    then
        echo "*** Installing $PACKAGE ***"
        apt-get -y -q install $PACKAGE
    fi
}

# this package installs the pgrep programm
function install_procps {
    # linux
    apt-get install procps
    
    # mac os x
    #sudo port install proctools
}

function install_nginx {

    INFO=`dpkg -s nginx 2>/dev/null`
    if [ "$INFO" != "" ]
    then
        return
    fi

    echo "*** Installing nginx ***"
    apt-add-repository -y ppa:nginx/stable
    apt-get -y -q update

    install nginx
}

function configure_nginx {

    if [ ! -f /home/$USERNAME/legacy/scripts/shell/migration/nginx.conf ]
    then
        return
    fi

    echo "*** Configuring nginx ***"
    cp /home/$USERNAME/legacy/scripts/shell/migration/nginx.conf /etc/nginx/nginx.conf

    nginx -s reload
}

function install_nodejs {

    EXEC=`which npm`
    if [ "$EXEC" != "" ]
    then
        return
    fi

    echo "*** Installing nodejs dependencies and package repository ***"
    # needed to add the apt-add-repository command
    apt-get -y -q install python-software-properties
    apt-add-repository -y ppa:chris-lea/node.js
    apt-get -y -q update

    install nodejs node
    install npm
}

function checkout_mono {

    echo "*** Checking out mono source code ***"

    # add the github host key to the known_hosts to avoid being asked later
    ssh -T -o StrictHostKeyChecking=no git@github.com

    MONO_TMP=/tmp/mono_checkout
    rm -Rf $MONO_TMP

    # cloning mono in a temp directory
    git clone git@github.com:jillix/mono.git $MONO_TMP

    # did the migration script change?
    check_latest_script $MONO_TMP

    # now give this to the mono user
    chown -R $USERNAME:$USERNAME $MONO_TMP
    mv $MONO_TMP /home/$USERNAME/mono
}

function check_latest_script {

    MONO_MIGRATION_SCRIPT=admin/scripts/migration/migrate_machine.sh
    MIGRATION_SCRIPT=$1/$MONO_MIGRATION_SCRIPT

    if [ ! -f $MIGRATION_SCRIPT ]
    then
        echo "The migration script file is missing from the mono repo. Looking for: $MONO_MIGRATION_SCRIPT" 1>&2
        echo "Aborting!" 1>&2
        exit 5
    fi

    diff $0 "$MIGRATION_SCRIPT" > /dev/null
    if [ $? != 0 ]
    then
        echo "This script has changed. Updating with the latest from the repository. Please run this script again." 1>&2
        echo "Aborting!" 1>&2
        cp "$MIGRATION_SCRIPT" $0
        exit 6
    fi
}

function checkout_legacy {

    echo "*** Checking out legacy source code ***"

    # cloning legacy in a temp directory
    git clone git@github.com:jillix/legacy.git ~/legacy_tmp
    chown -R $USERNAME:$USERNAME ~/legacy_tmp
    mv ~/legacy_tmp /home/$USERNAME/legacy

    # move some shortcut scripts to the user's home directory
    cp /home/$USERNAME/legacy/scripts/shell/migration/run_*.sh /home/$USERNAME/
    cp /home/$USERNAME/legacy/scripts/shell/migration/s*.sh /home/$USERNAME/
    chown -R $USERNAME:$USERNAME /home/$USERNAME/run_*.sh
    chown -R $USERNAME:$USERNAME /home/$USERNAME/s*.sh
}

function kill_pattern {
    # exit if no pattern was provided
    if [ "$1" == "" ]
    then
        return
    fi

    HAS_PATTERN=`ps aux | grep "$1" | grep -v grep`
    if [ "$HAS_PATTERN" != "" ]
    then
        ps aux | grep "$1" | grep -v grep | awk '{ print $2 }' | xargs kill
    fi
}

function setup_user {
    # TODO for test purposes only
    MONO_IMG_MNT=`mount | grep /home/$USERNAME/images`
    if [ "$MONO_IMG_MNT" != "" ]
    then
        umount /home/$USERNAME/images
    fi

    MONOUSER_ENTRY=`cat /etc/passwd | grep ":/home/$USERNAME:"`
    if [ "$MONOUSER_ENTRY" != "" ]
    then
        # delete first the crontab entries (if any)
        if [ -e "/var/spool/cron/crontabs/$USERNAME" ]
        then
            crontab -u $USERNAME -r
        fi

        # kill the user screens (if any)
        kill_pattern "SCREEN"
        # and remove the user screen sockets
        rm -rf /var/run/screen/S-$USERNAME

        # kill any remaining running nodes (if any)
        kill_pattern "node"

        # kill orient if running
        kill_pattern "orient"

        # waiting a little for orient to die
        sleep 5

        # now delete the user
        userdel -r $USERNAME
        if [ $? != 0 ]
        then
            echo "Something went wrong when trying to delete the $USERNAME user. Try to kill all his remaining processes manually and try again." 1>&2
            echo "Aborting!" 1>&2
            exit 4
        fi
    fi

    # create user account
    useradd -m -s /bin/bash $USERNAME

    # create the .ssh directory for this account
    mkdir /home/$USERNAME/.ssh

    # add this user's keys to the mono user keys
    cp ~/.ssh/authorized_keys /home/$USERNAME/.ssh/
    cp ~/.ssh/known_hosts /home/$USERNAME/.ssh/
    cp ~/.ssh/id_rsa_machine14 /home/$USERNAME/.ssh/

    # give the correct permissions to the .ssh directory
    chmod 0600 /home/$USERNAME/.ssh/authorized_keys
    chmod 0644 /home/$USERNAME/.ssh/known_hosts
    chmod 0600 /home/$USERNAME/.ssh/id_rsa_machine14
    chmod 0700 /home/$USERNAME/.ssh

    # give mono user ownership over .ssh directory
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh

    # create the ftp directory for temporary ftp uploads from machine14
    mkdir /home/$USERNAME/ftp
    chown -R $USERNAME:$USERNAME /home/$USERNAME/ftp
}

function install_software {
    
    # needed to add the apt-add-repository command
    install python-software-properties apt-add-repository
    
    # install pgrep
    install_procps

    # install git if not present
    install git

    # install nodejs
    install_nodejs

    # install mongodb if not present
    install mongodb mongo

    # install unzip if not present
    install unzip

    # install zip if not present
    install zip

    # install g++ if not present (needed by some node modules)
    install build-essential g++

    # install java runtime if not present
    install openjdk-7-jre-headless java
    
    # install graphicsmagick
    install graphicsmagick gm
    
    # install s3cmd if not present (for backups)
    install s3cmd
}

function import_legacy_databases {

    if [ "$NO_DATA" == "true" ]
    then
        return
    fi

    echo "*** Importing the legacy databases from $SOURCE_SERVER ***"
    rm -Rf dump*

    # perform a mongo dump on the source server
    scp /home/$USERNAME/legacy/scripts/shell/migration/export_mongo.sh $SOURCE_USERNAME@$SOURCE_SERVER:/home/$SOURCE_USERNAME/
    ssh -o StrictHostKeyChecking=no $SOURCE_USERNAME@$SOURCE_SERVER "~/export_mongo.sh $COMPLETE"

    # bring the mongo dump locally 
    scp $SOURCE_USERNAME@$SOURCE_SERVER:/home/$SOURCE_USERNAME/dump.zip .

    # unzip, restore, and cleanup
    unzip dump.zip

    echo "*** Importing the liqshop databases from $OLD_SOURCE_SERVER ***"
    # perform a mongo dump on machine14
    scp /home/$USERNAME/legacy/scripts/shell/migration/export_liqshop_machine14.sh $OLD_SOURCE_USERNAME@$OLD_SOURCE_SERVER:/home/$OLD_SOURCE_USERNAME/
    ssh -o StrictHostKeyChecking=no $OLD_SOURCE_USERNAME@$OLD_SOURCE_SERVER "~/export_liqshop_machine14.sh $COMPLETE"

    # bring the mongo dump locally 
    scp $OLD_SOURCE_USERNAME@$OLD_SOURCE_SERVER:/home/$OLD_SOURCE_USERNAME/dump.zip dump_sag.zip

    # unzip, restore, and cleanup
    unzip dump_sag.zip
    mv dump/sag dump/sag_old


    # remove the old sag and liqshop since we have one dump for them
    if [ -d dump/sag ]
    then
        echo "*** Removing the sag database dump ***"
        rm -R dump/sag
    fi
    if [ -d dump/liqshop ]
    then
        echo "*** Removing the liqshop database dump ***"
        rm -R dump/liqshop
    fi
    echo "*** Unpacking the new sag and liqshop database dumps ***"
    unzip -d dump/ /home/$USERNAME/legacy/scripts/shell/migration/sag-liqshop.zip


    echo "*** Overwriting the article_group with ones from $OLD_SOURCE_SERVER ***"
    # this corrects the latest article groups
    mv dump/sag_old/article_groups.bson dump/sag

    echo "*** Overwriting the orders with ones from $OLD_SOURCE_SERVER ***"
    # this prepares the orders for the conversion script below
    mv dump/sag_old/orders.bson dump/sag


    # now that we have a new dup, clean up the old databases in this dump
    DB_DIRS=dump/*
    for db in $DB_DIRS
    do
        DB=`basename $db`
        echo "*** Dropping db: $DB"
        mongo $DB --eval "printjson(db.dropDatabase())"
    done

    # now restore all databases
    mongorestore dump

    rm -Rf dump*

    # convert the articles in the new format
    echo "*** Converting the latest liqshop articles to the new format"
    mongo /home/$USERNAME/legacy/scripts/shell/migration/convert_liqshop_articles.js

    # convert the orders in the new format
    echo "*** Importing the old orders in the new common order format in sag.orders_new"
    mongo /home/$USERNAME/legacy/scripts/shell/migration/import_orders_new.js
}

function install_legacy_software {
    # install nginx for proxying to legacy processes
    install_nginx
    configure_nginx

    # install ftp for nightly sag import jobs
    install vsftpd
    # TODO one needs to add the sagag user if not added
    # now set up our configuration
    cp /home/$USERNAME/mono/admin/scripts/migration/vsftpd.conf /etc/vsftpd.conf
    # and restart the ftp daemon
    service vsftpd restart
}

function initialize_legacy {
    echo "*** Initializing legacy projects ***"
    HOME=/home/$USERNAME sudo -u $USERNAME sh -c "cd /home/$USERNAME/legacy ; npm install"
}

function initialize_mono {
    echo "*** Initializing mono projects ***"

    HOME=/home/$USERNAME sudo -u $USERNAME sh -c "cd /home/$USERNAME/mono ; npm install"

    mkdir -p /home/$USERNAME/images

    # this are temp files created to make sure happy and liqshop don't crash
    # because the steps below have to be perdormed manually
    mkdir /home/$USERNAME/images/happy
    mkdir /home/$USERNAME/images/liqshop
    touch /home/$USERNAME/images/happy/_sml.png
    touch /home/$USERNAME/images/happy/_big.png

    echo "####################################"
    echo "############### TODO ###############"
    echo "Manually execute the commands below!"
    echo "####################################"
    echo "1. Copy the machine14 liqshop images to the EBS volume vol-49ef7d21 (currently attached to micro) (the volume contains obolete liqshop images but GOOD happybonus ones)."
    echo "####################################"
    echo "2. Attach the volume vol-49ef7d21 to the new production instance."
    echo "####################################"
    echo "3. To mount the image directories (use mono user, no sudo):"
    echo "####################################"
    echo "rm -R /home/$USERNAME/images/*"
    echo "mount /dev/xvdi1 /home/$USERNAME/images"
    echo "ln --symbolic /home/mono/images/happy /home/$USERNAME/legacy/projects/happybonus/mods/article/img"
    echo "ln --symbolic /home/mono/images/liqshop /home/$USERNAME/legacy/projects/liqshop/files/pub/articles"
    echo "####################################"
    echo "4. Enable backups (follow the instructions in the email containing 's3cmd' configuration instructions):"
    echo "####################################"
    echo "s3cmd --configure"
    echo "####################################"
    echo "5. Manually start mono applications with --app and --port options"
    echo "####################################"
    echo "####################################"

    chown -R mono:mono /home/$USERNAME/images
}

function start_apps {

    # before we start the apps, insert the users into the happybonus and liqshop apps
    node /home/$USERNAME/legacy/scripts/liqshop_users.js
    node /home/$USERNAME/legacy/scripts/happybonus_users.js

    # do not allow the cron jobs to start applications since they will send false negative emails
    HOME=/home/$USERNAME sudo -u $USERNAME sh -c "cd /home/$USERNAME; ~/legacy/scripts/shell/starter.sh"
}

function final_steps {
    # install the cronjobs for the mono user
    crontab -u $USERNAME /home/$USERNAME/mono/admin/scripts/migration/cronjobs.txt
}


# perform the necessary tests
checks

# setup the mono user
setup_user

# install software
install_software

# checkout mono code
checkout_mono

# checkout legacy code
checkout_legacy

# install legacy software
install_legacy_software

# import old databases
import_legacy_databases

# initialize legacy
initialize_legacy

# initialize mono
initialize_mono

# start apps before the cron jobs
start_apps

# final steps
final_steps

