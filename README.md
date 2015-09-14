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
###Module guidelines
* A module has a isolated purpose and functionality.
* `flow` uses the module instances public API.
* Modules are independent and configurable.

Think of a module as a collection of functionality (`exports`) that can be used with the flow composition.

- **API**
    * Define a clear purpose and functionality.
    * Define the methods to export (accessible through flow).
    * Write flow configuration examples (with all possible options).
    * Write methods with [jsDocs](https://github.com/jsdoc3/jsdoc) comments.

- **Config**
    * Define configurable options.
    * Write full configuration example.

- **NPM Package**
    * Use always versions for dependencies.
    * No promts in npm scripts.

###Module instance config
#####Package:
Extend the `npm` `package.json` with a `composition` object, to define a default config for instances of the module:
```json
{
    "composition": {
        "public": "public/folder",
        "config": {},
        "flow": [],
        "client": {
            "module": [
                "module/script.js",
                "/public/repo/script.js",
                "//external/script.js"
            ],
            "dependencies": ["module"],
            "config": {},
            "flow": [],
            "styles": ["styles.css"],
            "markup": ["markup.html"]
        }
    }
}
```
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
##### Custom module:
Custom modules are created by providing the `composition` part of a module package, to the `module` key.
Expect the `client.dependencies` key is not supported, cause the client dependencies are dependent on installed
modules and custom modules cannot install other modules.
```json
{
   "roles": {"*": true},
   "name": "instance",
   "module": {
      "main": "folder/in/repo/index.js",
      "public": "public/folder",
      "config": {},
      "flow": [],
      "client": {
         "module": [
            "/public/script.js",
            "//external/script.js"
         ],
         "config": {},
         "flow": [],
         "styles": ["/public/styles.css"],
         "markup": ["markup.html"]
      }
   }
}
```
#####Flow:
Check out the work in progress: [Stream Network Specification](https://docs.google.com/a/ottiker.com/drawings/d/1gdj-OtzugN5YERXqqJ6OcMrowUiO9DsczmYvf3zyB9I/edit?usp=sharing).
Flow configs create streams, that allow to send and receive data between module instance methods.
Flow config format:
```js
[
    // First array item is the event name.
    // If the event name is in an array ["eventName"],
    // engine will remove the event after first call.
    "eventName",

    // Data or error handler
    /*
        function (stream, option, data) {
          return data;
        }
    */

    // Data handler call
    [":path.to.dataHandler", {"argN": "str{data}"}, "instance/optionHandler"],

    // Error handler call
    ["!path.to.errorHandler", {"argN": "str{data}"}, "instance/optionHandler"],

    // Stream handler
    /*
        function (stream, option) {
          return stream;
        }
    */
    // Stream handler call
    ["path.to.streamHandler", {"argN": "str{data}"}, "instance/optionHandler"]

    // Stream handler call.
    // stream.write(), will not write back to the input stream
    [">path.to.streamHandler", {"argN": "str{data}"}, "instance/optionHandler"]
]
```
######All options example:
```json
[
    ["event"],

    [":ALTR", {"data": {"my": "value"}}],
    ["!instance/error", {}],

    [">instance/method", {}],
    ["instance/method", {}],

    ["flow", "event"],
    ["instance/flow", "event"],

    ["flow", "@event"]
    ["flow", "@instance/event"]

    ["LOAD", ["instance"]],
    ":ERES"
]
```
First item in the flow array is the event name. The value can be a simple string `"eventName"` or it can be an array, which will remove the event after calling the first time.
Data handlers are indicated with a `:` char at the beginning of the method path `":dataHandler"`.

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
To fetch files from the applications public folder, or to emit and event on the server via an HTTP request, engine has two simple prefix that must be appended to the URL.

#####Public file path `/!`
Example: `/!/path/to/public/file.suffix`

#####Operation path `/@/[module_instance]/[event]/`
Example: `/@/[module_instance]/[event]/path/data/?search=query#hash`

###Engine API
#####engine.reload (client only)
Empties all caches, closes all sockets and resets the document.
```js
engine.reload();
```
#####engine.client
Is `true`, when engine runs in a client (browser). On the server this value is undefined.

#####engine.production
Is `true`, when the production argument `PRO` is passed to the process, otherwise `false`.
