var path = require('path');

// create config
var config = JSON.parse(process.env.config);

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.API_ROOT = paths.LIB_ROOT + 'api/';
paths.API_PUBLIC = paths.API_ROOT + 'public/';
paths.API_APPLICATION = paths.API_ROOT + 'application/';
paths.CLIENT_ROOT = paths.LIB_ROOT + 'client/';
paths.APPLICATION_ROOT = paths.MONO_ROOT + 'apps/' + config.id + '/';
paths.SERVER_ROOT = paths.LIB_ROOT + 'application/';
paths.MODULE_ROOT = paths.APPLICATION_ROOT + 'mono_modules/';
paths.PUBLIC_ROOT = paths.APPLICATION_ROOT + config.publicDir + '/';

// extend js functionality
require(paths.API_PUBLIC + 'extend');

// add paths to config
config.paths = paths;

module.exports = config;
