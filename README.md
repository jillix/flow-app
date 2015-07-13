engine
======

Engine is a framework/platform, which takes care of **resources**, **networking** and **interaction**.
Applications are made of module, which are instantiated and configured with **composition** files.

###Install the server
1. Clone the repository: `git clone git@github.com:jillix/engine.git`
2. Go to the engine dir `cd engine` and do a `npm install`
3. If you like to run `engine` globally, run `npm link` in the engine directory.

###Install an app
1. Clone the repository: `git clone [git_url]`
2. Change directory: `cd [app_repo_dir]/` and do a `npm install`

###Start an app
```sh
$ engine [absolute/path/to/app/repo] [port] ["fatal|error|warn|info|debug|trace"] ["PRO"]
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
        "flow": [{}],
        "client": {
            "module": [
                "module/script.js",
                "/public/repo/script.js",
                "//external/script.js"
            ],
            "dependencies": ["module"],
            "config": {},
            "flow": [{}],
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
    "flow": [{}],
    "load": ["instance"],
    "client": {
        "config": {},
        "flow": [{}],
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
      "flow": [{}],
      "client": {
         "module": [
            "/public/script.js",
            "//external/script.js"
         ],
         "config": {},
         "flow": [{}],
         "styles": ["/public/styles.css"],
         "markup": ["markup.html"]
      }
   }
}
```
#####Flow:
Flow configs create streams, that allow to send and receive data from a module instance method.
```json
{
    "on": "event",
    "1": false,
    "load": ["instance"],
    "to": "instance",
    "emit": "event",
    "call": "path|instance/event|ws://domain.com/instance/event",
    "data": ["path", {}]
}
```
Flow's `call` can now emit server side events, by providing a URL: `ws://domain.com/instance/event`. This will pipe the event stream to a websocket stream, which is emitted on the server side. If the domain is not part of the URL: `instance/event` engine uses the current client host.

###Path types
To fetch files from the applications public folder, or to emit and event on the server via an HTTP request, engine has two simple prefix that must be appended to the URL.

#####Public file path `/!`
Example: `/!/path/to/public/file.suffix`

#####Operation path `/@/[module_instance]/[event]/`
Example: `/@/[module_instance]/[event]/path/data/?search=query#hash`

###Event streams
Every module instance has the event stream (flow) object as prototype.
Heres and example how to use a flow stream in your module code:
```js
// exported module method
exports.method = function (stream) {

    // write back to the origin stream (callback events!)
    stream.write(err, data);

    // revceive data from origin stream
    stream.data(function (err, data, stream, options) {});

    // send this stream further down the pipe
    this.flow("eventName", stream);

    // ----------------------------------------------------

    // emit a new event stream (flow config can listen to those events)
    var myStream = this.flow("eventName");

    // Append a data handler
    // Data handlers are called in the order they were appended. And if a data handler
    // returns data, the next data handler will have the return value as data argument.
    myStream.data(function (err, data) {

        // ..do something with the data

        // return a data object for the next handlers.
        // this allows to transform the data as it flows in the event stream.
        return data;
    });

    // write to the event stream
    myStream.write(error, {data: "object"});

    // writes on "myStream" are received by the "stream" data handlers
    myStream.pipe(stream);

    // writes on "stream" are received by the "myStream" data handlers
    stream.pipe(myStream);

    // duplex
    myStream.pipe(stream).pipe(myStream);

    // pause stream
    myStream.pause();

    // resume stream
    myStream.resume();

    // end stream
    myStream.end();

    // append a custom write handler
    myStream._write = function (err, data) {}

    // append a custom end handler
    myStream._end = function (/* Arguments from the end method */) {}
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
###Engine API
#####engine.reload (client only)
Empties all caches, closes all sockets and resets the document.
```js
engine.reload();

// reload but keep the document (DOM)
engine.reload(true);
```
#####engine.client
Is `true`, when engine runs in a client (browser). On the server this value is undefined.

#####engine.production
Is `true`, when the production argument `PRO` is passed to the process, otherwise `false`.
