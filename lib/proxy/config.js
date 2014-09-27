var path = require('path');
var lib = path.normalize(__dirname + '/../../') + 'lib/';

// TODO this is only valid for current dev environment
var repo = path.normalize(__dirname + '/../../../') + 'service/'; // TODO dynamic value

// extend js functionality
require(lib + 'utils/extend');

// access values
process.env.Z_USER = '530639e09060f4703737e017';                // TODO dynamic value
process.env.Z_KEY = '0ULtAr8iH151p69q2XYTCht';                  // TODO dynamic value

// process values
process.env.Z_PORT = 8080;                                      // TODO dynamic value

// proxy values
process.env.Z_PROXY_PROCESSES = 'processes';
process.env.Z_PROXY_ROLE = 'proxy';

// path values
process.env.Z_PATH_CACHE = lib + 'cache/';
process.env.Z_PATH_MODELS = lib + 'models/';
process.env.Z_PATH_STORES = lib + 'stores/';
process.env.Z_PATH_PROCESS_COMPOSITION = repo + 'composition/';
