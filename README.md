engine
======

Engine is a framework/platform, which takes care of **resources**, **networking** and **interaction**.
Applications are made of module, which are instantiated and configured with **composition** files.

###Install the server
1. Append engine as a dependency in your app's `package.json`.
2. Define the start script: `"start": "./node_modules/engine/engine ."`

###Install an app
1. Clone the repository: `git clone [git_url]`
2. Change directory: `cd [app_repo_dir]/` and do a `npm install`

###Start an app
Go into your app root folder and do:
```sh
$ npm start [port] ["fatal|error|warn|info|debug|trace"] ["PRO"]
```
###Module package extension
Extend the `npm` `package.json` with a `composition` object, to define a default config for instances of the module:
```json
{
    "composition": {
        "public": "public/folder",
        "config": {},
        "flow": [],
        "load": ["instance"],
        "client": {
            "config": {},
            "flow": [],
            "load": ["instance"],
            "styles": ["styles.css"],
            "markup": ["markup.html"]
        }
    }
}
```
###Module instance config
##### Composition:
A composition config, configures an instance of a module.
```json
{
    "roles": {"*": true},
    "name": "instance",
    "module": "module",
    "config": {},
    "flow": [],
    "load": ["instance"],
    "client": {
        "config": {},
        "flow": [],
        "load": ["instance"],
        "styles": ["/path/file.css"],
        "markup": ["/path/file.html"]
    }
}
```
##### Composition with custom module:
```json
{
    "roles": {"*": true},
    "name": "instance",
    "module": {
        "main": "server_main.js",
        "browser": "./client_main.js"
    },
    "config": {},
    "flow": [],
    "load": ["instance"],
    "client": {
        "config": {},
        "flow": [],
        "load": ["instance"],
        "styles": ["/path/file.css"],
        "markup": ["/path/file.html"]
    }
}
```
The `module.browser` field represents the [browserify "browser" option](https://github.com/substack/node-browserify#browser-field).
###Flow:
Flow configs create streams, that allow to send and receive data between module instance methods.
#####Flow config *structure*:
```json
{
    "Data + Error": [
        ["data"],
        ["error"]
    ],
    "only Data": [["data"]],
    "only Error": [,["error"]]
}
```
#####Flow config *syntax*:
```js
{
    // Those events can be called with `instance.flow("eventName")`     
    "eventName": [
        
        // Data handlers:
        // If someone writes to the event stream, this array defines the sequenze,
        // in which the data chunk is passed to the handler functions.
        [

            // Handler:
            // A handler is a method of an instance,
            // optionally pass an `options` object to the function call.
            [
                // Define the `type` of the handler function.
                "TYPE[" +

                    // The ":" char defines a data handler.
                    ":," +

                    // The "." char defines a data hanlder,
                    // that is removed after the first data chunk.
                    "." +
                "]" +

                // The method path is a flat object key (dot notation).
                // If no instance is defined, the instance of the emitter (this.flow()) is used
                "METHOD[(instance/)method.path]",

                // An `optional` JSON object, that is passed to the handler function call.
                {"key": "value"}
            ],

            // Stream handler:
            // Stream handlers receive the raw event stream object to read from, or write to.
            // Stream handlers are always called, before the data handlers.
            [
                // LINK types define how a linked stream is connected to the flow network.
                "LINK[" +

                    // Write the data to the linked stream and let the linked stream write
                    // data to the next stream in the network.
                    ">," +

                    // Write data to the linked stream and simultaneously
                    // to the next stream in the network
                    "|" +
                "]" +
                
                // Emit events locally, over the network, or define
                // a custom handler to connect you custom streams.
                "NET[< = local, / = http, @ = ws, * = custom]" +

                // In case of "<", "/" or "@", the flow stream handler is called,
                // which connects an event stream to the current data flow.
                "FLOW[(instance/)event]" +

                //..or..

                // The method path is a flat object key (dot notation).
                // If no instance is defined, the instance of the emitter (this.flow()) is used
                "METHOD[(instance/)method.path]",

                // An `optional` JSON object, that is passed to the handler function call.
                {
                    // If your custom stream is in buffer mode,
                    // disbale object mode on the event stream.
                    "objectMode": false,
                    "key": "value"
                }
            ]
        ],

        // Error handlers
        [
            // Error handlers have the same configuration as the data handler.
        ]
    ]
}
```
#####Flow config *all combinations*:
```json
{
    "eventName": [
        [
            ":method",
            ":instance/method",
            ".method",
            ".instance/method",
            "><event",
            "><instance/event",
            ">/event",
            ">/instance/event",
            ">@event",
            ">@instance/event",
            ">*method",
            ">*instance/method",
            "|<event",
            "|<instance/event",
            "|/event",
            "|/instance/event",
            "|@event",
            "|@instance/event",
            "|*method",
            "|*instance/method",
            [":method", {"key": "value"}],
            [":instance/method", {"key": "value"}],
            [".method", {"key": "value"}],
            [".instance/method", {"key": "value"}],
            ["><event", {"key": "value"}],
            ["><instance/event", {"key": "value"}],
            [">/event", {"key": "value"}],
            [">/instance/event", {"key": "value"}],
            [">@event", {"key": "value"}],
            [">@instance/event", {"key": "value"}],
            [">*method", {"key": "value"}],
            [">*instance/method", {"key": "value"}],
            ["|<event", {"key": "value"}],
            ["|<instance/event", {"key": "value"}],
            ["|/event", {"key": "value"}],
            ["|/instance/event", {"key": "value"}],
            ["|@event", {"key": "value"}],
            ["|@instance/event", {"key": "value"}],
            ["|*method", {"key": "value"}],
            ["|*instance/method", {"key": "value"}]
        ],
        ["..same as data handlers"]
    ]
}
```

###Event streams
Every module instance has the event stream (flow) object as prototype.
Heres and example how to use a flow stream in your module code:
```js
// exported module method (stream handler)
exports.method = function (stream, options) {

    // revceive data from stream
    stream.data(function (stream, options, data) {

        // stop the data stream
        // Tip: this is handy, when an error occurs:
        stream.write(new Error());
        return null;

        // return modified data
        return data;
    });

    // revceive errors from stream
    stream.error(function (stream, options, error) {

        // stop the error stream
        return null;

        // return modified error
        return error;
    });

    // write to the stream
    stream.write(err, data);

    // pause stream
    stream.pause();

    // resume stream
    stream.resume();

    // end stream
    stream.end();

    // emit this stream
    var myStream = this.flow("eventName", stream);

    // create a new stream and emit it
    var myStream = this.flow("eventName");

    // create a new stream
    // NOTE: this feature will probably disapear.
    var myStream = this.flow([[/*flow call*/]]);

    // append a custom end handler
    myStream._end = function (/* Arguments from the end method */) {
        /* do custom things when a stream ends. closing sockets for example. */
    }
}

// callback case
function myMethod (callback) {

    // if you must call a callback function inside a data handler,
    // then you have to append the handler every time the method is called.
    // otherwise the scope, so the "callback" is always from the first method call.

    // create a stream, which is NOT cached.
    // to do this just pass "true" as second argument.
    var myStream = this.flow("eventName", true);

    // append a data handler.
    // note: if the stream would be cached, this data handler would be appended
    // every time the "myMethod" is called.
    myStream.data(function () {

        callback();

        // for streams, that are not cached, the module is responsible
        // to end the stream!
        myStream.end()
    });
}
```
###Logs
Engine provides a simple method to handle logging.
```js
// loggin in a instance
exports.method = function () {

      // log an error
      this.log('F', {msg: 'Fatal message', additional: 'data'});
      this.log('E', {additional: 'data'}, 'Error message');
      this.log('W', 'Warning message');
}

// login core engine
engine.log('I', {msg: 'Info message', additional: 'data'});
engine.log('D', {additional: 'data'}, 'Debug message');
engine.log('T', 'Trace message');
```
The available log levels are:
* `F` or `fatal`
* `E` or `error`
* `W` or `warn`
* `I` or `info`
* `D` or `debug`
* `T` or `trace`

All logs are streamed to `process.stdout`.

###Path types
Request files from a configured `public` directory, fetch module bundle file and call operations on the server side.
Note that, the first segment of a public file URL cannot contain a `:` char, since they are used to route to the to the corresponding operation.

**Not allowed paths for public files:**
* `/path:to/public/file.suffix`
* `/anExistingModuleName/client[.fingerprint].js`

#####Public file path `/`
Example: `/path/to/public/file.suffix`

#####Module file path `/[module]/client.[fingerprint].js/`
* Production example: `/view/client.273dhs7.js`
* Debug example: `/view/client.js`

#####Operation path `/[module_instance]:[event]/`
Example: `/registration:verifyEmail/tokenX/?locale=en_US#hash`
