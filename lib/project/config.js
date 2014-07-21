var path = require('path');
var lib = path.normalize(__dirname + '/../../') + 'lib/';
var app = path.normalize(__dirname + '/../../') + 'app/';

// extend js functionality
require(lib + 'utils/extend');

// process values
process.env.Z_PORT = 10001;         // TODO dynamic value
process.env.Z_HOST = '127.0.0.1';   // TODO dynamic value
process.env.Z_LIBS = '[""]';        // TODO dynamic value

process.env.Z_SESSION = '{"role": ""}';
process.env.Z_SESSION_MODEL = 'sessions';
process.env.Z_OP_KEY = '@';
process.env.Z_CORE_INST = 'Z';

// -----------------------------------------------------------------------------

// access values
process.env.Z_USER = '530639e09060f4703737e017';    // TODO dynamic value
process.env.Z_KEY = '0ULtAr8iH151p69q2XYTCht';      // TODO dynamic value

// path values
process.env.Z_PATH_CACHE = lib + 'cache/';
process.env.Z_PATH_MODELS = lib + 'models/';
process.env.Z_PATH_STORES = lib + 'stores/';
process.env.Z_PATH_MIDDLEWARE = lib + 'middleware/';
process.env.Z_PATH_PROJECT = lib + 'project/';
process.env.Z_PATH_CLIENT = lib + 'client/';
process.env.Z_PATH_MODULE = lib + 'module/';
process.env.Z_PATH_VIEWS = lib + 'views/';
process.env.Z_PATH_PROCESS_PUBLIC = app + 'public/';
process.env.Z_PATH_PROCESS_MARKUP = app + 'markup/';
process.env.Z_PATH_PROCESS_MODULES = app + 'modules/';

// store values
process.env.Z_STORE_SYSTEM = 'system';
process.env.Z_STORE_STORES_MODEL = 'stores';
process.env.Z_STORE_PROJECTS_MODEL = 'projects';
process.env.Z_STORE_SYSTEM_DB_PREFIX = 'project_';
process.env.Z_STORE_ADAPTER = 'mongodb';
process.env.Z_STORE_CONFIG = '{"host":"127.0.0.1","port":27017,"database":"project_53078e9fe266dbc030ef890c"}'; // TODO dynamic value

// model vaules
process.env.Z_MODEL_MODELS = 'models';
process.env.Z_MODEL_ADAPTER = 'modm';
process.env.Z_MODEL_ENTITY = 'z_models';
