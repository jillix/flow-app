var fs = require('fs');
var path = require('path');

// access values
process.env.Z_USER = '530639e09060f4703737e017';
process.env.Z_KEY = '0ULtAr8iH151p69q2XYTCht';

// path values
process.env.Z_PATH_ROOT = path.normalize(__dirname + '/../../');
process.env.Z_PATH_LIB = process.env.Z_PATH_ROOT + 'lib/';
process.env.Z_PATH_CACHE = process.env.Z_PATH_LIB + 'cache/';
process.env.Z_PATH_MODELS = process.env.Z_PATH_LIB + 'models/';
process.env.Z_PATH_STORES = process.env.Z_PATH_LIB + 'stores/';

// proxy values
process.env.Z_PROXY_PORT = 8080;
process.env.Z_PROXY_PROCESSES = 'processes';

// store values
process.env.Z_STORE_SYSTEM = 'system';
process.env.Z_STORE_STORES_MODEL = 'stores';
process.env.Z_STORE_PROJECTS_MODEL = 'projects';
process.env.Z_STORE_SYSTEM_DB_PREFIX = 'project_';
process.env.Z_STORE_ADAPTER = 'mongodb';
process.env.Z_STORE_CONFIG = '{"host":"127.0.0.1","port":27017,"database":"project_53078e9fe266dbc030ef890c"}';

// model vaules
process.env.Z_MODEL_MODELS = 'models';
process.env.Z_MODEL_ADAPTER = 'modm';
process.env.Z_MODEL_ENTITY = 'z_models';

// extend js functionality
require(process.env.Z_PATH_LIB + 'utils/extend');

// read mono package
//var configs = JSON.parse(fs.readFileSync(process.env.Z_PATH_ROOT + 'config.json'));

/*

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