var path = require('path');
var lib = path.normalize(__dirname + '/../../') + 'lib/';

// TODO this is only valid for current dev environment
var app = path.normalize(__dirname + '/../../../') + 'admin/'; // TODO dynamic value

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
process.env.Z_PATH_PROCESS_COMPOSITION = app + 'composition/';
