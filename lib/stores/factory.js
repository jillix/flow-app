var M = process.mono;
var fs = require('fs');
var model = require(M.config.paths.MODELS + 'factory');

// TODO get this values from a config
var storeModel = {
    name: 'stores'
};
var projectsModel = {
    name: 'projects'
};

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

module.exports = fetchStoreHandler;

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
    adapters[adapter].connect(M.config.owner, M.config.apiKey, config, function (err, store) {

        if (err) {
            return callback(err);
        }

        // save store in cache
        M.cache.stores.save(cacheKey, store);

        callback(err, store);
    });
}

// fetch a store config from the system store
function fetchStoreHandler (name, project, callback) {

    // check callback
    if (typeof project === 'function') {
        callback = project;
        project = undefined;
    }

    // get store from cache
    var cacheKey = (project || '') + name;

    var store = M.cache.stores.get(cacheKey);
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

// fetch a store config from the system store
function fetchStore (cacheKey, name, project, callback) {

    // check callback
    if (typeof project === 'function') {
        callback = project;
        project = undefined;
    }

    // connect to a different project systemStore
    var config;
    var systemCacheKey = M.config.store.systemConfig.database;
    if (project) {

        // update systemCacheKey
        systemCacheKey = project.id + systemCacheKey;

        // copy system db config
        config = {};
        for (var key in M.config.store.systemConfig) {
            config[key] = M.config.store.systemConfig[key];
        }

        // overwrite system db config
        config.database = M.config.store.systemDbPrefix + project.id;
    }

    // get system store
    if (name === M.config.store.systemStoreName) {
        return factory(systemCacheKey, M.config.store.systemAdapter, config || M.config.store.systemConfig, function (err, store) {

            if (err || !store) {
                return callback(err);
            }

            callback(err, store);
        });
    }

    // get store model
    model.factory(storeModel, function (err, stores) {

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

function getProjectIdFromName (name, callback) {

    // check cache
    var id = M.cache.projects.get(name);
    if (id) {
        return callback(null, id);
    }

    // get project store
    model.factory(projectsModel, function (err, projects) {

        if (err) {
            return callback(err);
        }

        // fetch project id
        projects.request({m: 'findOne', q: {'process.name': name}, o: {_id: 1}}, function (err, project) {

            if (err || !project) {
                return callback(err || 'No project found');
            }

            M.cache.projects.save(name, project._id);

            callback(null, project._id);
        });
    });
}
