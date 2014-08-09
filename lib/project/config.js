var path = require('path');
var engine_root = path.normalize(__dirname + '/../../');
var lib = engine_root + 'lib/';
var repo = process.argv[2][0] === '/' ? process.argv[2] : path.normalize(engine_root + '/../' + process.argv[2]) + '/';    // TODO dynamic value

// extend js functionality
require(lib + 'utils/extend');

// access values
process.env.Z_USER = '530639e09060f4703737e017';                            // TODO dynamic value
process.env.Z_KEY = '0ULtAr8iH151p69q2XYTCht';                              // TODO dynamic value

// process values
process.env.Z_PORT = process.argv[3] || 10001;                              // TODO dynamic value

// session values
process.env.Z_SESSION_PUBLIC = '*';
process.env.Z_SESSION_ROLE_KEY = 'role';
process.env.Z_SESSION_LOCALE_KEY = 'locale';
process.env.Z_SESSION_MODEL = 'sessions';
process.env.Z_SESSION_ROLE = 'session';

// engine values
process.env.Z_OP_KEY = '@';
process.env.Z_CORE_INST = 'Z';
process.env.Z_CLIENT_LIBS = repo + 'libs.json';

// send events
process.env.Z_SEND_INST_REQ = 'I>';
process.env.Z_SEND_INST_RES = '<I';
process.env.Z_SEND_MODEL_REQ = 'M>';
process.env.Z_SEND_MODEL_RES = '<M';
process.env.Z_SEND_MODEL_DATA_REQ = 'm>';
process.env.Z_SEND_MODEL_DATA_RES = '<m';
process.env.Z_SEND_VIEW_REQ = 'V>';
process.env.Z_SEND_VIEW_RES = '<V';
process.env.Z_SEND_MODULE_REQ = 'M';
process.env.Z_SEND_CLIENT_REQ = 'Z';

// path values
process.env.Z_PATH_CACHE = lib + 'cache/';
process.env.Z_PATH_MODELS = lib + 'models/';
process.env.Z_PATH_STORES = lib + 'stores/';
process.env.Z_PATH_MIDDLEWARE = lib + 'middleware/';
process.env.Z_PATH_PROJECT = lib + 'project/';
process.env.Z_PATH_CLIENT = lib + 'client/';
process.env.Z_PATH_MODULE = lib + 'module/';
process.env.Z_PATH_VIEWS = lib + 'views/';

process.env.Z_PATH_PROCESS_REPO = repo;
process.env.Z_PATH_PROCESS_PUBLIC = repo + 'public/';
process.env.Z_PATH_PROCESS_MARKUP = repo + 'markup/';
process.env.Z_PATH_PROCESS_MODULES = repo + 'modules/';
process.env.Z_PATH_PROCESS_COMPOSITION = repo + 'composition/';
