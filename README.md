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
        "flow": {},
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
    "flow": {},
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
    "flow": {},
    "load": ["instance"],
    "styles": ["/path/file.css"],
    "markup": ["/path/file.html"]
}
```
The `module.browser` field represents the [browserify "browser" option](https://github.com/substack/node-browserify#browser-field).

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
