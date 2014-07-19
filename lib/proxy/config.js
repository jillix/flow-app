var os = require('os');
var fs = require('fs');
var path = require('path');
var argv = require('optimist');

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.PROXY_SERVER = paths.LIB_ROOT + 'proxy/server.js';
paths.PROJECT_SERVER = paths.LIB_ROOT + 'project/server.js';
paths.USERS_ROOT = paths.MONO_ROOT + 'users/';
paths.MODELS = paths.LIB_ROOT + 'models/';
paths.STORES = paths.LIB_ROOT + 'stores/';

// TOOD get this config from a file or the environment
var admin = {
    owner: '530639e09060f4703737e017',
    apiKey: '0ULtAr8iH151p69q2XYTCht',
    project: '53078e9fe266dbc030ef890c'
};

//var projectModel = 'm_projects';
var storeConfig = {
    storesCollection: 'm_stores',
    systemDbPrefix: 'project_',
    systemStoreName: 'system',
    systemAdapter: 'mongodb',
    systemConfig: {
        host: process.env.MONGODB_PORT_27017_TCP_ADDR, // host of linked docker container (mongodb)
        port: process.env.MONGODB_PORT_27017_TCP_PORT, // port of linked docker container (mongodb)
        database: 'project_' + admin.project
    }
};

// extend js functionality
require(paths.LIB_ROOT + 'utils/extend');

// read mono package
var mono = JSON.parse(fs.readFileSync(paths.MONO_ROOT + 'package.json'));

var config = {};

 // paths
config.paths = paths;

// network
config.host = '127.0.0.1';
config.port = 8080;

// save store config
config.store = storeConfig;

// save package infos in config
config.mono = mono;

// owner and apiKey
config.owner = admin.owner;
config.apiKey = admin.apiKey;

module.exports = config;
