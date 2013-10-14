jillix Web Framework

## Fresh Server Installation

These steps must be followed when installing Mono on a new EC2 server or when you want to cleanup the `mono` user and reinstall the server.

1. Launch a EC2 instance
2. Login with the `ubuntu` user
3. `touch install_machine.sh`
4. `chmode +x install_machine.sh`
5. Copy the contents of [this file](https://github.com/jillix/mono/blob/master/admin/scripts/install_machine.sh) into the script created above.

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

