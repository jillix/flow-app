engine
======
A flow web server.

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

###Path types
Request files from a configured `public` directory, fetch module bundle file and call operations on the server side.
Note that, the first segment of a public file URL cannot contain a `:` char, since they are used to route to the to the corresponding operation.

**Not allowed paths for public files:**
* `/flow/*`
* `/module/*`

#####Public file path `/`
Example: `/path/to/public/file.suffix`

#####Module file path `/module/[module]/bundle.[fingerprint].js/`
* Production example: `/module/view/bundle.273dhs7.js`
* Debug example: `/module/view/bundle.js`

#####Operation path `/flow/[module_instance]:[event]/`
Example: `/flow/registration:verifyEmail/tokenX/?locale=en_US#hash`
