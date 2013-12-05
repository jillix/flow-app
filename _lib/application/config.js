var path = require('path');

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + '_lib/';
paths.API_ROOT = paths.LIB_ROOT + 'api/';
paths.API_PUBLIC = paths.API_ROOT + 'public/';
paths.API_APPLICATION = paths.API_ROOT + 'application/';
paths.CLIENT_ROOT = paths.LIB_ROOT + 'client/';
paths.APPLICATION_ROOT = paths.MONO_ROOT + 'apps/' + process.env.app + '/';
paths.MODULE_ROOT = paths.APPLICATION_ROOT + 'mono_modules/';

// extend js functionality
require(paths.API_PUBLIC + 'extend');

function getConfig() {
    // create config
    var config = JSON.parse(process.env.config);
    
    // TODO this looks like a hack, we should find a soulution to this
    config.MODULE_DEV_TAG = 'dev';
    
    // add paths to config
    config.paths = paths;
    
    return config;
}

module.exports = getConfig();
