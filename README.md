# jillix Engine

Engine is a framework/platform, which takes care of **resource loading**, **networking** and **interaction**.
Applications are made of module instances, which are configured in **composition** files.

##Install the server
1. Clone the repository: `git clone git@github.com:jillix/engine.git`
2. Go to the engine dir `cd engine` and do a `npm install`

##Install an app
1. Clone the repository: `git clone [git_url]`
2. Change directory: `cd [app_repo_dir]/` and do a `npm install`

##Start an app
`./engine [absolute/path/to/app/repo] [port]`

####Composition
Module instance:
```json
"name": "string",
"module": "string"|{object},
"roles": {"name": true|false},
"flow": [{in}],
"config": {object},
"client": {
    "config": {object},
    "flow": [{in}],
    "extFlow": [{in}],
    "load": ["name"],
    "styles": ["file"],
    "markup": ["file"]
}
```
Flow `in`:
```json
{
    "in": "pattern|click",
    "selector": "#",
    "scope": "global|parent",
    "1": true|false,
    "noRoute": true|false,
    "dontPrevent": true|false,
    "out": [{out}]
}
```
Flow `out`:
```json
{
    "load": ["name"],
    "route": "path{value}",
    "emit": "event",
    "call": "method",
    "to": "instance",
    "data": {object}
    "set": {
        "key": "path{value}",
        "key": "$#css:attr{value}"
    }
}
```

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

####Event handler types
* link: `function (link) {}`
* event: `function (event, data) {}`

####Emit events
```js
this.emit({/*custom event*/}, {data: "object"});
```