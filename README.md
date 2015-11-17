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
        "styles": ["styles.css"],
        "markup": ["markup.html"]
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
    "styles": ["/path/file.css"],
    "markup": ["/path/file.html"]
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
    "styles": ["/path/file.css"],
    "markup": ["/path/file.html"]
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
        "error"
    ],
    "only Data": [["data"]]
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
                "NET[> = flow, * = custom]" +

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
                    "to": "instance",
                    "net": "http|ws",
                    "key": "value"
                }
            ]
        ],

        // Error handlers
        "onErrorEvent"
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
            ">>event",
            ">*method",
            ">*instance/method",
            "|>event",
            "|*method",
            "|*instance/method",
            [":method", {"key": "value"}],
            [":instance/method", {"key": "value"}],
            [".method", {"key": "value"}],
            [".instance/method", {"key": "value"}],
            [">>event", {"to": "instance", "net": "ws"}],
            [">*method", {"key": "value"}],
            [">*instance/method", {"key": "value"}],
            ["|>event", {"to": "instance", "net": "ws"}],
            ["|*method", {"key": "value"}],
            ["|*instance/method", {"key": "value"}]
        ],
        "onErrorEvent"
    ]
}
```

###Event streams
Every module instance has the event stream (flow) object as prototype.
Heres and example how to use a flow stream in your module code:
```js
// stream handler
exports.method = function (stream, options) {
    // the first argument "stream" is a a duplex stream.
    
    // pipe to a writable
    stream.pipe(otherWritableStream);
    
    // read from a readable
    otherReadableStream.pipe(stream);
    
    // use another duplex stream
    stream.pipe(transformStream).pipe(stream);
}

// data handler
function myMethod (options, data, next) {
    
    // Push data to response (readable), without calling the next data handler.
    // Note, that you have to call next again, to signal that the handler is done.
    next(data, true);
    
    // Pass transformed data to the next data handler.
    next(null, data);
    
    // Emit en error
    next(new Error('Something bad happend.'));
}
```

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
