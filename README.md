#mono

## installation

#### server installation

These steps must be followed when installing Mono on a new EC2 server or when you want to cleanup the `mono` user and reinstall the server.

**NOTE**

* This will remove the `mono` user account and all his files!!!
* MongoDb databases are not affected.

1. Launch a EC2 instance
2. Login with the `ubuntu` user
3. Run this bash snippet:

```sh
echo "Enter Github user name: " ; read GH_USERNAME ; curl -u $GH_USERNAME -H "Accept: application/vnd.github.raw" -o ~/install_machine.sh -s "https://api.github.com/repos/jillix/mono/contents/admin/scripts/install_machine.sh" ; chmod +x ~/install_machine.sh ; sudo -E ~/install_machine.sh
```

#### local installation

After you have `node` and `MongoDb` on your Unix-based machine, run:

```sh
git clone git@github.com:jillix/mono.git
cd mono
npm install
```

## CLI usage
```
usage: mono [actions] [options]

The mono proxy server v0.1.0

actions:
  start           start mono server (it's the same as without start)
  stop            stop mono server and applications

options:
  -v, --version   print mono's version
  -d, --dev       start mono proxy directly (false)
  -h, --host      define a host (useful with a proxy)
  -l, --log       specify a path for the log file (/home/adi/repos/mono/tmp/log.txt)
  -t, --logTerm   print output of the applications in the terminal (false)
  --port          port for http and websockets communication (8000)
  --appPortStart  application port range start (10001)
  --appPortEnd    application port range end (19999)
  --attempts      number of attempts to restart a script (3)
  --silent        run the child script silencing stdout and stderr (false)
  --verbose       run forver with verbose (false)
  --minUptime     minimum uptime (millis) for a script to not be considered "spinning" (2000)
  --spinSleepTime time to wait (millis) between launches of a spinning script (1000)
  --dbHost        host address for MongoDB (127.0.0.1)
  --dbPort        MongoDB port (27017)
  --help          you're staring at it

Documentation can be found at https://github.com/jillix/mono/
```

#### usage examples

**start mono server**

```sh
# as deamon
./bin/mono start

# in dev mode with app output
./bin/mono -dt
```

**stop mono server**

```sh
# when started as deamon
./bin/mono stop

# when started in dev mode (press Ctrl + C)
^C
```

## middleware
**http**
```js
M.on('request', function (req, res, next) {

    // do middleware stufff with req and res, ex. sessions
    req.session = {};
    
    // continue with request
    next();
});
```
**websockets**
```js
M.on('connection', function(ws, next) {

    // do middleware stufff with ws, ex. sessions
    ws.session = {};
    
    // continue with connection
    next();
});
```
