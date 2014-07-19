var path = require('path');

// create config
var config = JSON.parse(process.env.config);

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.CLIENT_ROOT = paths.LIB_ROOT + 'client/';
paths.USERS_ROOT = paths.MONO_ROOT + 'users/';
paths.PROJECT_ROOT = paths.USERS_ROOT + config.owner + '/projects/' + config.id + '/';
paths.SERVER_ROOT = paths.LIB_ROOT + 'project/';
paths.MODULE_ROOT = paths.PROJECT_ROOT + 'mono_modules/';
paths.PUBLIC_ROOT = paths.PROJECT_ROOT + config.publicDir;
paths.TEMPLATE_ROOT = paths.PROJECT_ROOT + config.templateDir + '/';
paths.MIDDLEWARE = paths.LIB_ROOT + 'middleware/';
paths.MODULE = paths.LIB_ROOT + 'module/';
paths.MODELS = paths.LIB_ROOT + 'models/';
paths.STORES = paths.LIB_ROOT + 'stores/';
paths.VIEWS = paths.LIB_ROOT + 'views/';

// TOOD get this config from project settings
config.store = {
    storesCollection: 'm_stores',
    systemDbPrefix: 'project_',
    systemStoreName: 'system',
    systemAdapter: "mongodb",
    systemConfig: {
        host: 'localhost',
        port: '27017',
        database: 'project_' + config.id
    }
};

// extend js functionality
require(paths.LIB_ROOT + 'utils/extend');

// add paths to config
config.paths = paths;

module.exports = config;
