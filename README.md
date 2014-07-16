#mono

## installation
comming soon...

```sh
$ git clone git@github.com:jillix/mono.git
$ cd mono
$ npm install
```

## CLI usage
```
usage: mono [actions] [options]

The mono proxy server v0.1.0

actions:
  start           start proxy server (it's the same as without "start")
  stop            stop mono proxy and processes

options:
  -v, --version   print mono's version
  -h, --host      define a host (useful with a proxy) ()
  -l, --log       specify a path for the log file (/home/adrian/repos/mono/tmp/log.txt)
  --port          port for http and websockets communication (8000)
  --appPortStart  process port range start (10001)
  --appPortEnd    process port range end (19999)
  --attempts      number of attempts to restart a script (3)
  --minUptime     minimum uptime (millis) for a script to not be considered "spinning" (2000)
  --spinSleepTime time to wait (millis) between launches of a spinning script (1000)
  --help          you're staring at it

Documentation can be found at https://github.com/jillix/mono/
```

#### usage examples

**start/stop mono server**

```sh
# start mono
$ mono

# stop mono
$ mono stop

# restart mono
$ mono stop && mono
```
