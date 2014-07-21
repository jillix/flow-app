var env = process.env;

var fs = require('fs');
var model = require(env.Z_PATH_MODELS + 'factory');
var cache = require(env.Z_PATH_CACHE + 'cache');

var systemStoreConfig = JSON.parse(env.Z_STORE_CONFIG);

var storesCache = cache('stores');
var projectsCache = cache('projects');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

module.exports = fetchStoreHandler;

// fetch a store config from the system store
function fetchStoreHandler (name, project, callback) {

    // check callback
    if (typeof project === 'function') {
        callback = project;
        project = undefined;
    }

    // get store from cache
    var cacheKey = (project || '') + name;

    var store = storesCache.get(cacheKey);
    if (store) {
        return callback(null, store);
    }

    // convert project name to project id (only for admin processes)
    if (project) {
        return getProjectIdFromName(project, function (err, project_id) {

            if (err) {
                return callback(err);
            }

            fetchStore(cacheKey, name, {name: project, id: project_id}, callback);
        });
    }

    fetchStore(cacheKey, name, callback);
}

function getProjectIdFromName (name, callback) {

    // check cache
    var id = projectsCache.get(name);
    if (id) {
        return callback(null, id);
    }

    // get project store
    model.factory(env.Z_STORE_PROJECTS_MODEL, function (err, projects) {

        if (err) {
            return callback(err);
        }

        // fetch project id
        projects.request({m: 'findOne', q: {'name': name}, o: {_id: 1}}, function (err, project) {

            if (err || !project) {
                return callback(err || 'No project found');
            }

            projectsCache.save(name, project._id);

            callback(null, project._id);
        });
    });
}

// fetch a store config from the system store
function fetchStore (cacheKey, name, project, callback) {

    // check callback
    if (typeof project === 'function') {
        callback = project;
        project = undefined;
    }

    // connect to a different project systemStore
    var config;
    var systemCacheKey = env.Z_STORE_SYSTEM;
    if (project) {

        // update systemCacheKey
        systemCacheKey = project.id + systemCacheKey;

        // copy system db config
        config = {};
        for (var key in systemStoreConfig) {
            config[key] = systemStoreConfig[key];
        }

        // overwrite system db config
        config.database = env.Z_STORE_SYSTEM_DB_PREFIX + project.id;
    }

    // get system store
    if (name === env.Z_STORE_SYSTEM) {
        return factory(systemCacheKey, env.Z_STORE_ADAPTER, config || systemStoreConfig, function (err, store) {

            if (err || !store) {
                return callback(err);
            }

            callback(err, store);
        });
    }

    // get store model
    model.factory(env.Z_STORE_STORES_MODEL, function (err, stores) {

        if (err) {
            return callback(err);
        }

        // find store
        stores.request({m: 'findOne', q: {name: name}}, function (err, dbStore) {

            if (err || !dbStore) {
                return callback(err || 'store "' + name + '" not found.');
            }

            // create store
            factory(cacheKey, dbStore.adapter, dbStore.config, callback);
        });
    });
}

// create a new store
function factory (cacheKey, adapter, config, callback) {

    // check if adpater exists
    if (!adapters[adapter]) {
        return callback('store: adapter "' + adapter + '" not found.');
    }

    // require adapter
    if (typeof adapters[adapter] === 'string') {
        adapters[adapter] = require(adapters[adapter]);
    }

    // connect to store
    adapters[adapter](env.Z_USER, env.Z_KEY, config, function (err, store) {

        if (err) {
            return callback(err);
        }

        // save store in cache
        storesCache.save(cacheKey, store);

        callback(err, store);
    });
}
