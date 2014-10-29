var path = require('path');
var engine_root = path.normalize(__dirname + '/../../');
var lib = engine_root + 'lib/';

// ------------------------------------------------------------------ CLI CHECKS
// read repo path
var repo = process.argv[2];
if (!repo) {
    throw new Error('No repo path argument.');
}

// get the path to the repo
repo = repo[0] === '/' ? repo : path.normalize(engine_root + '/../' + repo) + '/';

// get port
if (!process.argv[3] || !process.argv[3].replace(/[^0-9]/g, '')) {
    throw new Error('Not port argument.');
}
process.env.Z_PORT = process.argv[3];

// check production mode
if (process.argv[4] === 'PRO') {
    process.env.Z_PRODUCTION = 'true';
}

// ------------------------------------------------------------------ ENV CEHCKS
// access values
process.env.Z_USER = '530639e09060f4703737e017';    // TODO get value from env
process.env.Z_KEY = '0ULtAr8iH151p69q2XYTCht';      // TODO get value from env

// session values
process.env.Z_SESSION_PUBLIC = '*';
process.env.Z_SESSION_ROLE_KEY = 'role';
process.env.Z_SESSION_LOCALE_KEY = 'locale';
process.env.Z_SESSION_USER_KEY = 'user';

// engine values
process.env.Z_OP_KEY = '@';
process.env.Z_CORE_INST = 'Z';
process.env.Z_CLIENT_LIBS = repo + 'libs.json';

// module role
process.env.Z_ROLE_MODULE = 'module';

// send events
process.env.Z_SEND_INST_REQ = 'I>';
process.env.Z_SEND_MODEL_REQ = 'M>';
process.env.Z_SEND_VIEW_REQ = 'V>';
process.env.Z_SEND_MODULE_REQ = 'M';
process.env.Z_SEND_CLIENT_REQ = 'Z';

// http caching
process.env.Z_HTTP_CACHE_MAX_AGE = 86400;
process.env.Z_HTTP_CACHE_MAX_AGE_FINGERPRINT = 94670000;

// path values
process.env.Z_PATH_ENGINE = engine_root;
process.env.Z_PATH_CACHE = lib + 'cache/';
process.env.Z_PATH_MODELS = lib + 'models/';
process.env.Z_PATH_STORES = lib + 'stores/';
process.env.Z_PATH_MIDDLEWARE = lib + 'middleware/';
process.env.Z_PATH_PROJECT = lib + 'project/';
process.env.Z_PATH_CLIENT = lib + 'client/';
process.env.Z_PATH_MODULE = lib + 'module/';
process.env.Z_PATH_VIEWS = lib + 'views/';
process.env.Z_PATH_UTILS = lib + 'utils/';

process.env.Z_PATH_PROCESS_REPO = repo;
process.env.Z_PATH_PROCESS_PUBLIC = repo + 'public/';
process.env.Z_PATH_PROCESS_MARKUP = repo + 'markup/';
process.env.Z_PATH_PROCESS_MODULES = repo + 'modules/';
process.env.Z_PATH_PROCESS_COMPOSITION = repo + 'composition/';
