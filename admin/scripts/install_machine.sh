#!/bin/bash

USERNAME=mono
CREDFILE=/tmp/credentials.json

function checks {

    if [ "$SUDO_USER" = "" ]
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

function setup_user {

    MONOUSER_ENTRY=`cat /etc/passwd | grep ":/home/$USERNAME:"`
    if [ "$MONOUSER_ENTRY" != "" ]
    then
        # delete first the crontab entries (if any)
        if [ -e "/var/spool/cron/crontabs/$USERNAME" ]
        then
            crontab -u "$USERNAME" -r
        fi

        # kill the user screens (if any)
        kill_pattern "SCREEN"
        # and remove the user screen sockets
        rm -rf "/var/run/screen/S-$USERNAME"

        # kill any remaining running nodes (if any)
        kill_pattern "node"

        # kill orient if running
        kill_pattern "orient"

        # waiting a little for orient to die
        sleep 5

        # touch the user mail spool to avoid an error message that this is not found
        touch "/var/mail/$USERNAME"

        # now delete the user
        userdel -r -f "$USERNAME"
        if [ $? != 0 ]
        then
            echo "Something went wrong when trying to delete the $USERNAME user. Try to kill all his remaining processes manually and try again." 1>&2
            echo "Aborting!" 1>&2
            exit 4
        fi
    fi

    # create user account
    useradd -m -s /bin/bash "$USERNAME"

    # create the .ssh directory for this account
    mkdir "/home/$USERNAME/.ssh"

    # add this user's keys to the mono user keys
    cp ~/.ssh/authorized_keys "/home/$USERNAME/.ssh/"
    cp ~/.ssh/known_hosts "/home/$USERNAME/.ssh/"

    # give the correct permissions to the .ssh directory
    chmod 0600 "/home/$USERNAME/.ssh/authorized_keys"
    chmod 0644 "/home/$USERNAME/.ssh/known_hosts"
    chmod 0700 "/home/$USERNAME/.ssh"

    # give mono user ownership over .ssh directory
    chown -R "$USERNAME:$USERNAME" "/home/$USERNAME/.ssh"
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
}

function install_mongodb {

    if [ -f /etc/apt/sources.list.d/mongodb.list ]
    then
        install mongodb-10gen mongo
        return
    fi

    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
    touch /etc/apt/sources.list.d/mongodb.list
    echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
    apt-get update
    apt-get install mongodb-10gen
}

NEEDS_RECONNECT=

function install_software {

    # allow the ssh daemon to pass the git variables
    GREP_RESULT=`grep "Accept\w.* GIT_\*" /etc/ssh/sshd_config`
    if [ -z "$GREP_RESULT" ]
    then
        # append GIT_* to the Accept directive line
        sed -i 's/Accept\w.* LC_\*$/& GIT_*/' /etc/ssh/sshd_config
        NEEDS_RECONNECT=true
    fi

    # needed to add the apt-add-repository command
    install python-software-properties apt-add-repository

    # install pgrep
    install procps pgrep

    # install git if not present
    install git
    # and make it coloured
    HOME="/home/$USERNAME" sudo -u "$USERNAME" sh -c "git config --global color.ui auto"

    # install nodejs
    install_nodejs

    # install mongodb if not present
    install_mongodb

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

function checkout_mono {

    echo "*** Checking out mono source code ***"

    # add the github host key to the known_hosts to avoid being asked later
    ssh -T -o StrictHostKeyChecking=no git@github.com

    MONO_TMP=/tmp/mono_checkout
    rm -Rf "$MONO_TMP"

    # cloning mono in a temp directory
    git clone git@github.com:jillix/mono.git "$MONO_TMP"

    # did the script change?
    check_latest_script "$MONO_TMP"

    # now give this to the mono user
    chown -R "$USERNAME:$USERNAME" "$MONO_TMP"
    mv "$MONO_TMP" "/home/$USERNAME/mono"
}

function get_credentials {

    if [ -f "$CREDFILE" ]
    then
        GH_USERNAME=`node --eval "console.log(require('$CREDFILE').github.username)"`
        GH_PASSWORD=`node --eval "console.log(require('$CREDFILE').github.password)"`
        BB_USERNAME=`node --eval "console.log(require('$CREDFILE').bitbucket.username)"`
        BB_PASSWORD=`node --eval "console.log(require('$CREDFILE').bitbucket.password)"`
        if [ "$GH_USERNAME" ]
        then
            echo "Found credentials.json from user $GH_USERNAME (Github). Remove the $CREDFILE file if you want to provide new credentials."
        fi
    fi

    # ask the user to provide his Github and Bitbucket credentials if they were not found (all must be provided)
    if [ -z "$GH_USERNAME" ]
    then
        echo "TODO: these credential steps have to be improved"
        echo "Please provide your Github username"
        read GH_USERNAME
        if [ -z "$GH_USERNAME" ]
        then
            echo "The Github username is mandatory" 1>&2
            exit 7
        fi
        echo "And your Github password"

        read GH_PASSWORD
        if [ -z "$GH_PASSWORD" ]
        then
            echo "The Github password is mandatory" 1>&2
            exit 7
        fi
    fi

    if [ -z "$BB_USERNAME" ]
    then
        echo "Please provide your Bitbucket username (Enter if the same with Github)"
        read BB_USERNAME
        if [ -z "$BB_USERNAME" ]
        then
            BB_USERNAME=$GH_USERNAME
        fi

        echo "And your Bitbucket password (Enter if the same with Github)"
        read BB_PASSWORD
        if [ -z "$BB_PASSWORD" ]
        then
            BB_PASSWORD=$BB_PASSWORD
        fi
    fi

    # we write the credentials.json file that we later copy into the mono tmp directory and it will be used for installations
    echo "{\"github\":{\"type\":\"basic\",\"username\":\"$GH_USERNAME\",\"password\":\"$GH_PASSWORD\"},\"bitbucket\":{\"username\":\"$BB_USERNAME\",\"password\":\"$BB_PASSWORD\"}}" > "$CREDFILE"
}

function check_latest_script {

    INSTALL_SCRIPT=admin/scripts/install_machine.sh
    REPO_INSTALL_SCRIPT=$1/$REPO_INSTALL_SCRIPT

    if [ ! -f $REPO_INSTALL_SCRIPT ]
    then
        echo "The installation script file is missing from the mono repo. Looking for: $INSTALL_SCRIPT" 1>&2
        echo "Aborting!" 1>&2
        exit 5
    fi

    diff "$0" "$REPO_INSTALL_SCRIPT" > /dev/null
    if [ $? != 0 ]
    then
        echo "This script has changed. Updating with the latest from the repository. Please run this script again." 1>&2
        echo "Aborting!" 1>&2
        cp "$REPO_INSTALL_SCRIPT" "$0"
        exit 6
    fi
}

function initialize_mono {

    echo "*** Configuring network (port 80 to 8000 routing) ***"

    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8000

    echo "*** Initializing mono projects ***"

    # copy the credentials.json file in place
    HOME="/home/$USERNAME" sudo -u "$USERNAME" sh -c "mkdir \"/home/$USERNAME/mono/tmp\" ; cp \"$CREDFILE\" \"/home/$USERNAME/mono/tmp\""
    # run npm install in momno
    ssh -A "$USERNAME@localhost" "cd ~/mono ; npm install"

    echo "####################################"
    echo "############### TODO ###############"
    echo "Manually execute the commands below!"
    echo "####################################"
    echo "1. Enable backups (follow the instructions in the email containing 's3cmd' configuration instructions):"
    echo "        s3cmd --configure"
    echo "####################################"
    echo "####################################"
}

# TODO currently not used
function start_apps {
    # do not allow the cron jobs to start applications since they will send false negative emails
    HOME="/home/$USERNAME" sudo -u "$USERNAME" sh -c "cd \"/home/$USERNAME\" ; ~/legacy/scripts/shell/starter.sh"
}

function final_steps {
    # install the cronjobs for the mono user
    crontab -u "$USERNAME" "/home/$USERNAME/mono/admin/scripts/migration/cronjobs.txt"

    if [ "$NEEDS_RECONNECT" ]
    then
        echo "!!!! NOTE: you have to logout and login again in order for your git commiter name and email (GIT_*) to be propagated"
        sudo service ssh reload
    fi
}

# perform the necessary tests
checks

# setup the mono user
setup_user

# install software
install_software

# checkout mono code
checkout_mono

# get user repo credentials (needed for npm install)
get_credentials

# initialize mono (npm install)
initialize_mono

# start apps before the cron jobs
#start_apps

# final steps
final_steps

