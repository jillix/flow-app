#git
sudo apt-get update
sudo apt-get install git

#mongodb
sudo apt-get update
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
sudo touch /etc/apt/sources.list.d/mongodb.list
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install mongodb-10gen

#nodejs and npm
sudo apt-get update
sudo apt-get install python-software-properties python g++ make
sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install nodejs

#java7
sudo apt-get update
sudo apt-get install openjdk-7-jre

sudo apt-get update

#add mono user
useradd -m -s /bin/bash mono
sudo mkdir /home/mono/.ssh/
sudo cp .ssh/authorized_keys /home/mono/.ssh/
sudo chown -R mono /home/mono/.ssh/
sudo chmod 700 /home/mono/.ssh/
sudo chmod 600 /home/mono/.ssh/authorized_keys
