var path = require('path');

// create config
var config = JSON.parse(process.env.config);

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.CLIENT_ROOT = paths.LIB_ROOT + 'client/';
paths.USERS_ROOT = paths.MONO_ROOT + 'users/';
paths.APPLICATION_ROOT = paths.USERS_ROOT + config.owner + '/apps/' + config.id + '/';
paths.SERVER_ROOT = paths.LIB_ROOT + 'application/';
paths.MODULE_ROOT = paths.APPLICATION_ROOT + 'mono_modules/';
paths.PUBLIC_ROOT = paths.APPLICATION_ROOT + config.publicDir + '/';
paths.TEMPLATE_ROOT = paths.APPLICATION_ROOT + config.templateDir + '/';

// extend js functionality
require(paths.LIB_ROOT + 'extend');

// add paths to config
config.paths = paths;

module.exports = config;
