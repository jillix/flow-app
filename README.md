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

# start and stop mono
$ mono && mono stop
```

##Anatomy of an instance
```json
{
    "_name": "instance name",
    "_config": "custom instance config",
    "_module": "sonv name of the module",
    "_ready": "indicates that an instance is ready",
    "view":{
        "name": {
            "_": "reference to instance",
            "_tp": "template function",
            "html": "html string",
            "dom": "reference to dom node",
            "on": "event handlers",
            "config": "custom module config",
            "prototype": {
                "render": "render function",
                "set": "set a template"
            }
        }
    },
    "model": {
        "name": {
            "_": "reference to instance",
            "data": "current data array",
            "on": "event handlers",
            "config": "custom module config",
            "prototype": {
                "req": "model request function"
            }
        }
    },
    "prototype": {
        "route": "route to url",
        "emit": "emit an event",
        "on": "listen to an event",
        "off": "unlisten to an event or event handler",
        "_load": "load an element (inst, view, module)",
        "_path": "get a value from a path (ex. Obj.prop.method)",
        "_clone": "clone an object",
        "_toArray": "convert to array",
        "_flat": "flatten objects",
        "_uid": "create a random string",
        "_reload": "reload the client (without reloading the window)"
    },
    "methods..": "custom module methods"
}
```
