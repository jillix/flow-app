#engine

Engine is a framework/platform, which takes care of **resource loading**, **networking** and **interaction**.
Applications are made of module instances, which are configured in **composition** files.

###Install the server
1. Clone the repository: `git clone git@github.com:jillix/engine.git`
2. Go to the engine dir `cd engine` and do a `npm install`

###Install an app
1. Clone the repository: `git clone [git_url]`
2. Change directory: `cd [app_repo_dir]/` and do a `npm install`

###Start an app
`./engine [absolute/path/to/app/repo] [port]`

####Modules
Extend the `npm` `package.json` with following infos, to load module client resources:
```json
{
    "public": "public/folder",
    "clientDependencies": ["moduleName"],
    "components": {
        "scripts": ["file.js"],
        "styles": ["file.css"],
        "markup": ["file.html"]
    }
}
```

####Composition
* Module instance:
```json
{
    "name": "string",
    "module": "string",
    "roles": {"roleName": true},
    "flow": [{}],
    "config": {},
    "client": {
        "config": {},
        "flow": [{}],
        "extFlow": [{}],
        "load": ["moduleInstanceName"],
        "styles": ["/path/file.css"],
        "markup": ["/path/file.html"]
    }
}
```
* Flow `in`:
```json
{
    "in": "event_pattern",
    "1": false,
    "noRoute": false,
    "out": [{}]
}
```
* extFlow `in`:
A module is responsible to handle an `extFlow` config.
This example is form https://github.com/adioo/view.
```json
{
    "in": "DOM_event",
    "selector": "#",
    "scope": "global|parent",
    "dontPrevent": false,
    "out": [{}]
}
```
* Flow `out`:
```json
{
    "load": ["name"],
    "route": "path{value}",
    "emit": "event",
    "call": "method",
    "to": "instance",
    "data": {},
    "set": {
        "key": "path{value}",
        "key": "$#css:attr{value}"
    }
}
```

####Event handler types
* link: `function (link) {}`
* event: `function (event, data) {}`

####Emit events
```js
this.emit({/*custom event*/}, {data: "object"});
```