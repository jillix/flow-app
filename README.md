#mono

## installation
#### TODO server
#### TODO local

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

```
# as deamon
./bin/mono start

# in dev mode
./bin mono -d

# in dev mode with app terminal outpu
./bin mono -dt
```

**stop mono server**

```
node stop
```

