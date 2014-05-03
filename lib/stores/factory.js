var M = process.mono;
var fs = require('fs');

// TODO make this configs configurable
var systemStoreApiKey = 'systemStore';
var storesCollection = 'm_stores';
var adapatersPath = __dirname + '/adapters/';
var systemAdapter;
var systemConfig;

// adapter cache
var adapters = {};

// read available store adapters
var availableAdapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < availableAdapters.length; ++i) {
    
    // TODO how should the adapter file structure look like?
    adapters[availableAdapters[i]] = adapatersPath + availableAdapters[i] + '/' + availableAdapters[i] + '.js';
}

module.exports = setup;

// create a new store
function factory (adapter, config, callback) {
    
    // check if adpater exists
    if (!adapters[adapter]) {
        return callback('store: adapter "' + adapter + '" not found.');
    }
    
    // require adapter
    if (typeof adapters[adapter] === 'string') {
        adapters[adapter] = require(adapters[adapter]);
    }
    
    // connect to store
    adapters[adapter].connect(config, callback);
}

// fetch a store config from the system store
function fetchStore (name, project, callback) {
    
    // check callback
    if (typeof project === 'function') {
        callback = project;
        project = undefined;
    }
    
    // check is system store exists
    if (!M[systemStoreApiKey]) {
        return callback('store factory not ready.');
    }
    
    // connect to systemStores of other projects
    var config;
    if (project) {
        
        // copy system db config
        config = {};
        for (var key in systemConfig) {
            config[key] = systemConfig[key];
        }
        
        // overwrite system db config
        // TODO change to project_ when admin gets installed
        //config.database = 'project_' + project;
        config.database = 'app_' + project;
    }
    
    factory(systemAdapter, config || systemConfig, function (err, store) {
        
        if (err || !store) {
            return callback(err || 'system store not found. ' + project);
        }
        
        // get store model (mongodb)
        var collection = store.collection(storesCollection);
        collection.findOne({name: name}, function (err, storeConfig) {
            
            if (err || !storeConfig) {
                return callback(err || 'store "' + name + '" not found.');
            }
            
            // create store
            factory(storeConfig.adapter, storeConfig.config, callback);
        });
    });
}

// setup store factory
function setup (adapter, config, callback) {
    
    systemAdapter = adapter;
    systemConfig = config;
    
    // create system store
    factory(adapter, config, function (err, store) {
        
        if (err) {
            return callback(err);
        }
        
        // add system store to api 
        M[systemStoreApiKey] = store;
        
        // add fetch store method to api
        M.store = fetchStore;
        
        callback(null, store);
    });
}
