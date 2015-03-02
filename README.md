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

##Composition
TODO document the [composition configuration](https://docs.google.com/a/ottiker.com/drawings/d/1JL4PaJjawA0h593ea5oOEs8WlC8HSs1GZnZrvXF0GWw/edit) in the README.

##Modules
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
