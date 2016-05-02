Flow-App
======

A flow web server.

### Install the server

* Append `flow-app` as a dependency in your app's `package.json`:
```json
{
    "dependencies": {
        "flow-app": "github:jillix/flow-app"
    }
}
```
* **NEEDS UPDATE** Define the npm scripts (**this should not be necessary**)

```json
"scripts": {
    "install": "flow-pack .",
    "start": "flow-app . -c path/to/ssl/certificate.pem -k path/to/ssl/key.pem",
}
```

### Install the app

1. Clone the repository: `git clone [git_url]`
2. Change directory: `cd [app_repo_dir]/` and do a `npm install`

### Start an app

Go into your app root folder and do:

```sh
$ npm start
```

To change the default ports (HTTPS: `8000`, HTTP: 8001) and log level (`error`) use:

```sh
$ npm start -- [-p <port>] [-q <httpPort>] [-l <fatal|error|warn|info|debug|trace>]
```

All communication will be made over HTTPS on port `port`. All HTTP connections will be redirected to HTTPS.

### Module package extension

Extend the `npm` `package.json` with a `composition` object, to define a default config for instances of the module:

```json
{
    "composition": {
        "config": {},
        "flow": {},
        "load": ["instance"]
    }
}
```

##### Composition with custom module:

To create a custom module instance form a app repo file, just define a path as module name.
The base path for custom module files is: `*/app/app_modules`. 

```json
{
    "module": "/module/main.js",
    "browser": "/module/client.js",
}
```

The `browser` field represents the [browserify "browser" option](https://github.com/substack/node-browserify#browser-field).

### Path types

Request files from a configured `public` directory, fetch module bundle file and call operations on the server side.
Note that, the first segment of a public file URL cannot contain a `:` char, since they are used to route to the to the corresponding operation.

**Not allowed paths for public files:**
* `/flow/*`
* `/flow_comp/*`
* `/module/*`
* `/app_module/*`

##### Public file path `/`

Example: `/path/to/public/file.suffix`

##### Module file path `/module/[module]/bundle.[fingerprint].js/`

* Production example: `/module/view/bundle.273dhs7.js`
* Debug example: `/module/view/bundle.js`

##### Custom module file path `/app_module/[module]/bundle.[fingerprint].js/`

* Production example: `/app_module/view/bundle.273dhs7.js`
* Debug example: `/app_module/view/bundle.js`

##### Flow emit path `/flow/[module_instance]:[event]/`

Example: `/flow/registration:verifyEmail/tokenX/?locale=en_US#hash`

##### Module instance composition path `/flow_comp/[module_instance]`

Example: `/flow_comp/compositionName`
