var path = require('path');

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + '_lib/';
paths.API_ROOT = paths.LIB_ROOT + 'api/';
paths.API_PUBLIC = paths.API_ROOT + 'public/';
paths.API_APPLICATION = paths.API_ROOT + 'application/';
paths.CLIENT_ROOT = paths.LIB_ROOT + 'client/';
paths.APPLICATION_ROOT = paths.MONO_ROOT + 'apps/' + process.env.app + '/';
paths.MODULE_ROOT = paths.APPLICATION_ROOT + 'mono_modules/';

// extend js functionality
require(paths.API_PUBLIC + 'extend');

function getConfig() {
    // create config
    var config = {
        
        // TODO review this config and load it from the db
        "id"            : process.env.app,
        "coreMiid"      : "M",
        "coreKey"       : "@",
        "logLevel"      : "debug",
        "locale"        : "en_US",
        "publicDir"     : "public",
        "compress" : false,
        "compressTypes": {
            "css": 1,
            "js": 1,
            "html": 1,
            "htm": 1,
            "txt": 1
        },
        "session": {
            "id": "_s",
            "locale": "_l",
            "path": "/",
            "expire": 168,
            "colName": 'sessions',
            "publicRole": ''
        },
        "routes": {
            "/": "layout"
        },
        
        // get db config from spawner
        dbHost: process.env.dbHost || '127.0.0.1',
        dbPort: process.env.dbPort || 27017,
        
        // TODO this looks like a hack, we should find a soulution to this
        MODULE_DEV_TAG: 'dev'
    };
    
    // add paths to config
    config.paths = paths;
    
    return config;
}

module.exports = getConfig();
