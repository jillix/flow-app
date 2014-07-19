#mono

## installation
comming soon...

```sh
$ git clone git@github.com:jillix/engine.git
$ cd engine
$ npm install
```

## CLI usage
```
usage: engine [actions] [options]

Engine's proxy server v0.1.0

actions:
  start           start proxy server (it's the same as without "start")
  stop            stop proxy and processes

options:
  -v, --version   print engine's version
  -h, --host      define a host (useful with a proxy) ()
  -l, --log       specify a path for the log file (/home/adrian/repos/engine/log.txt)
  --port          port for http and websockets communication (8000)
  --appPortStart  process port range start (10001)
  --appPortEnd    process port range end (19999)
  --attempts      number of attempts to restart a script (3)
  --minUptime     minimum uptime (millis) for a script to not be considered "spinning" (2000)
  --spinSleepTime time to wait (millis) between launches of a spinning script (1000)
  --help          you're staring at it

Documentation can be found at https://github.com/jillix/engine/
```

#### usage examples

**start/stop mono server**

```sh
# start engine
$ engine

# stop engine
$ engine stop

# restart engine
$ engine stop && engine
```
