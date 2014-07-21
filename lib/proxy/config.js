var path = require('path');
var lib = path.normalize(__dirname + '/../../') + 'lib/';

// extend js functionality
require(lib + 'utils/extend');

// proxy values
process.env.Z_PROXY_PORT = 8080;
process.env.Z_PROXY_PROCESSES = 'processes';

// -----------------------------------------------------------------------------

// access values
process.env.Z_USER = '530639e09060f4703737e017';
process.env.Z_KEY = '0ULtAr8iH151p69q2XYTCht';

// path values
process.env.Z_PATH_CACHE = lib + 'cache/';
process.env.Z_PATH_MODELS = lib + 'models/';
process.env.Z_PATH_STORES = lib + 'stores/';

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
