var fs = require('fs');
var path = require('path');

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.CACHE = paths.LIB_ROOT + 'cache/';
paths.MODELS = paths.LIB_ROOT + 'models/';
paths.STORES = paths.LIB_ROOT + 'stores/';

// extend js functionality
require(paths.LIB_ROOT + 'utils/extend');

// read mono package
var configs = JSON.parse(fs.readFileSync(paths.MONO_ROOT + 'config.json'));

/*

// proxy config
Z_PROXY_MODEL: 'processes'
Z_PROXY_PORT: 8080

// access config
Z_KEY: ''
Z_USER: ''

// system store config
Z_SYSTEM_STORE_ADAPTER: ''
Z_SYSTEM_STORE_CONF: ''
Z_SYSTEM_STORE_NAME: 'system'

// stores config
Z_STORES_MODEL_STORES: 'stores'
Z_STORES_MODEL_PROJECTS: 'projects'

// models config
Z_MODELS_NAME: 'models'
Z_MODELS_ADAPTER: 'modm'
Z_MODELS_ENTITY: 'z_models'


// ADMIN API
appPortStart                [lib/proxy/spawner.js:113, lib/proxy/spawner.js:140]
appPortEnd                  [lib/proxy/spawner.js:140]

// PROJECT PROCCESS
libs                        [lib/project/router.js:19|20|21]
operationKey                [lib/project/router.js:29, lib/project/server.js:35]
coreInstance                [lib/project/router.js:29, lib/project/send.js:113, lib/module/module.js:356]
port                        [lib/project/server.js:137]
host                        [lib/project/server.js:137]
id                          [lib/project/server.js:138] // probably obsolete with docker
session                     [lib/middleware/session.js:7]
session.role                [lib/project/server.js:19, lib/module/module.js:241, lib/module/module.js:247]
publicDir                   [lib/project/config.js:14]
templateDir                 [lib/project/config.js:15]

// PROXY PROCESS
port                        [lib/proxy/server.js:151, lib/proxy/server.js:157]

// ALL PROCESS
owner                       [lib/stores/factory.js:158]
apiKey                      [lib/stores/factory.js:158]

store.systemConfig.database [lib/stores/factory.js:96]
store.systemConfig          [lib/stores/factory.js:104|105|114]
store.systemDbPrefix        [lib/stores/factory.js:109]
store.systemAdapter         [lib/stores/factory.js:114]
store.systemStoreName       [lib/stores/factory.js:113, lib/models/factory.js:13]

*/

// TOOD get this config from a file or the environment
var admin = {
    owner: '530639e09060f4703737e017',
    apiKey: '0ULtAr8iH151p69q2XYTCht',
    project: '53078e9fe266dbc030ef890c' // the admin project id (to fetch the model where all the processes are saved)
};

//var projectModel = 'm_projects';
var storeConfig = {
    systemDbPrefix: 'project_',
    systemStoreName: 'system',
    systemAdapter: 'mongodb',
    systemConfig: {
        host: process.env.MONGODB_PORT_27017_TCP_ADDR || '127.0.0.1', // host of linked docker container (mongodb)
        port: process.env.MONGODB_PORT_27017_TCP_PORT || 27017, // port of linked docker container (mongodb)
        database: 'project_' + admin.project
    }
};


var config = {};

 // paths
config.paths = paths;

// network
config.port = 8080;
config.processes = 'processes';

// owner and apiKey
config.owner = admin.owner;
config.apiKey = admin.apiKey;

// save store config
config.store = storeConfig;

module.exports = config;
