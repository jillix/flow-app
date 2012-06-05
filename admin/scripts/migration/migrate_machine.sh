#!/bin/bash

USERNAME=mono
ADMINNAME=$SUDO_USER
SOURCE_USERNAME=webadmin
SOURCE_SERVER=machine14.abc4it.com


function checks {

    if [ "$ADMINNAME" = "" ]
    then
        echo "This script must be run as super user. Use:"
        echo "    sudo -E $0"
        exit
    fi

    if [ "$SSH_AUTH_SOCK" = "" ]
    then
        echo "In order to access git repos you must enable SSH Agent Forwarding."
        echo "For this you must:"
        echo "    - connect to this server using the ssh -A option and"
        echo "    - run this script with sudo -E option to preserve the environement variables"
        exit
    fi

}

function install {

    if [ "$1" = "" ]
    then
        echo "install called with no arguments. Exiting!"
        exit
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

    # add the github host key to the known_host to avoid being asked later
    ssh -T -o StrictHostKeyChecking=no git@github.com

    MONO_TMP=/tmp/mono_checkout
    rm -Rf $MONO_TMP

    # cloning mono in a temp directory
    git clone git@github.com:adioo/mono.git $MONO_TMP

    # did the migration script change?
    check_latest_script $MONO_TMP

    # initialize and update the submodules
    cd $MONO_TMP
    git submodule init
    git submodule update
    cd ~

    # now give this to the mono user
    chown -R $USERNAME:$USERNAME $MONO_TMP
    mv $MONO_TMP /home/$USERNAME/mono
}

function check_latest_script {

    MONO_MIGRATION_SCRIPT=admin/scripts/migration/migrate_machine.sh
    MIGRATION_SCRIPT=$1/$MONO_MIGRATION_SCRIPT

    if [ ! -f $MIGRATION_SCRIPT ]
    then
        echo "The migration script file is missing from the mono repo. Looking for: $MONO_MIGRATION_SCRIPT"
        echo "Aborting!"
        exit
    fi

    diff $0 "$MIGRATION_SCRIPT" > /dev/null
    if [ $? != 0 ]
    then
        echo "This script has changed. Updating with the latest from the repository. Please run this script again."
        echo "Aborting"
        cp "$MIGRATION_SCRIPT" $0
        exit
    fi
}

function checkout_legacy {

    echo "*** Checking out legacy source code ***"

    # cloning legacy in a temp directory
    git clone git@github.com:adioo/legacy.git ~/legacy_tmp
    chown -R $USERNAME:$USERNAME ~/legacy_tmp
    mv ~/legacy_tmp /home/$USERNAME/legacy

    # move some shortcut scripts to the user's home directory
    cp /home/$USERNAME/legacy/scripts/shell/migration/run_*.sh /home/$USERNAME/
    cp /home/$USERNAME/legacy/scripts/shell/migration/s*.sh /home/$USERNAME/
    chown -R $USERNAME:$USERNAME /home/$USERNAME/run_*.sh
    chown -R $USERNAME:$USERNAME /home/$USERNAME/s*.sh
}

function setup_user {
    # TODO for test purposes only
    userdel -r $USERNAME

    # create user account
    useradd -m -s /bin/bash $USERNAME

    # create the .ssh directory for this account
    mkdir /home/$USERNAME/.ssh

    # add this user's keys to the mono user keys
    cp ~/.ssh/authorized_keys /home/$USERNAME/.ssh/

    # give the correct permissions to the .ssh directory
    chmod 0600 /home/$USERNAME/.ssh/authorized_keys
    chmod 0700 /home/$USERNAME/.ssh
    
    # give mono user ownership over .ssh directory
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
}

function install_software {

    # needed to add the apt-add-repository command
    install python-software-properties apt-add-repository

    # install git if not present
    install git

    # install nodejs
    install_nodejs

    # install mongodb if not present
    install mongodb mongo

    # install unzip if not present
    install unzip

    # install g++ if not present (needed by some node modules)
    install build-essential g++

    # install java runtime if not present
    install openjdk-7-jre-headless java
}

function import_legacy_databases {

    echo "*** Importing the legacy databases from machine14 ***"
    rm -Rf dump*

    # perform a mongo dump on the old machine14
    scp /home/$USERNAME/legacy/scripts/shell/migration/export_mongo.sh $SOURCE_USERNAME@$SOURCE_SERVER:/home/$SOURCE_USERNAME/
    # add -c options to the export script if a complete DB migrasion is needed
    ssh -o StrictHostKeyChecking=no $SOURCE_USERNAME@$SOURCE_SERVER "~/export_mongo.sh"
    #ssh -o StrictHostKeyChecking=no $SOURCE_USERNAME@$SOURCE_SERVER "~/export_mongo.sh -c"

    # bring the mongo dump locally 
    scp $SOURCE_USERNAME@$SOURCE_SERVER:/home/$SOURCE_USERNAME/dump.zip .

    # unzip, restore, and cleanup
    unzip dump.zip

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
}

function install_legacy_software {
    # install nginx for proxying to legacy processes
    install_nginx

    # install ftp for nightly sag impot jobs
    install vsftpd
}

function initialize_legacy {
    echo "*** Initializing legacy projects ***"
    HOME=/home/$USERNAME sudo -u $USERNAME sh -c "cd /home/$USERNAME/legacy ; npm install"
}

function initialize_mono {
    echo "*** Initializing mono projects ***"
    HOME=/home/$USERNAME sudo -u $USERNAME sh -c "cd /home/$USERNAME/mono ; npm install"
}


# perform the necessary tests
checks

# setup the mono user
setup_user

# install software
install_software

# checkout mono code
checkout_mono

# initialize mono
initialize_mono

# install legacy software
install_legacy_software

# checkout legacy code
checkout_legacy

# import old databases
import_legacy_databases

# initialize legacy
initialize_legacy

