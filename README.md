#mono

## installation
comming soon...

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

**start/stop mono server**

```sh
# start mono
mono

# stop mono
mono stop

# start and stop mono
mono stop && mono
```

##Anatomy of an instance
```json
{
    "_name": "instance name",
    "_config": "custom instance config",
    "_module": "sonv name of the module",
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
