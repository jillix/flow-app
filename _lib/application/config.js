var path = require('path');

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + '_lib/';
paths.API_ROOT = paths.LIB_ROOT + 'api/';
paths.API_PUBLIC = paths.API_ROOT + 'public/';
paths.API_APPLICATION = paths.API_ROOT + 'application/';
paths.APPLICATION_ROOT = paths.MONO_ROOT + 'apps/' + process.env.app + '/';

// extend js functionality
require(paths.API_PUBLIC + 'extend');

function getConfig() {
    // create config
    var config = {
        
        // TODO review this config options
        "coreMiid"      : "core",
        "operationKey"  : "@",
        "logLevel"      : "debug",
        "compressFiles" : false,
        "compressFileTypes": {
            "css": 1,
            "js": 1,
            "html": 1,
            "htm": 1,
            "txt": 1
        },
        "session": {
            "id": "_s",
            "locale": "_l",
            "path": "/"
        },
        "routes": {
            "/": "layout"
        },
        
        // TODO get this values from process.env
        dbHost: '127.0.0.1' || process.env.dbHost,
        dbPort: 27017 || process.env.dbPort
    };
    
    // add paths to config
    config.paths = paths;
    
    return config;
}

module.exports = getConfig();
