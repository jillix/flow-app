jillix Web Framework

## Fresh Server Installation

These steps must be followed when installing Mono on a new EC2 server or when you want to cleanup the `mono` user and reinstall the server.

**NOTE** This will remove the `mono` user account and all his files!!!

1. Launch a EC2 instance
2. Login with the `ubuntu` user
3. run this bash snippet:

```
echo "Enter Github user name: " ; read GH_USERNAME ; curl -u $GH_USERNAME -H "Accept: application/vnd.github.raw" -o ~/install_machine.sh -s "https://api.github.com/repos/jillix/mono/contents/admin/scripts/install_machine.sh" ; chmod +x ~/install_machine.sh ; sudo -E ~/install_machine.sh
```

## Installation

```
npm install
```
This also installs the OrientDB server in the `bin` directory and the mono database form the `admin/scripts/orientdb` directory.

Start the mono server:
```
node lib/proxy/server.js
```

Start mono as deamon with forever: (the log is written to tmp/log.txt)
```
node start
```

## Options

### Log to Terminal

Use the following command to have applications send the output also to the terminal (by default all application log only into their `log.txt` in the application directory):

```
node lib/proxy/server.js --logTerm
```

### Log Flags

#### Usage

```
node lib/proxy/server.js --log flag1,flag2,flag3
```

or

```
node lib/proxy/server.js --log flag1 --log flag2 --log flag3
```

#### Flags

- `requestTimes`: displays the time necessary for each request
- `applicationInstallation`: prints details during an application installation
- `moduleInstallation`: prints details during a module installation

