var M = process.mono;
var fs = require('fs');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

module.exports = fetchStore;

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
function fetchStore (name, project, callback) {
    
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
    
    // connect to systemStores of other projects
    var config;
    var systemCacheKey = M.config.store.systemConfig.database;
    if (project) {
        
        // update systemCacheKey
        systemCacheKey = project + systemCacheKey;
        
        // copy system db config
        config = {};
        for (var key in M.config.store.systemConfig) {
            config[key] = M.config.store.systemConfig[key];
        }
        
        // overwrite system db config
        config.database = M.config.store.systemDbPrefix + project;
    }
    
    // get system store, from this or an other project, to read store config
    factory(systemCacheKey, M.config.store.systemAdapter, config || M.config.store.systemConfig, function (err, store) {
        
        if (err || !store) {
            return callback(err || 'system store not found. ' + project);
        }
        
        // return local system without makeing a db call
        if (!project && name === M.config.store.systemStoreName) {
            return callback(err, store);
        }
        
        // find store (mongodb)
        var collection = store.collection(M.config.store.storesCollection);
        collection.findOne({name: name}, function (err, storeConfig) {
            
            if (err || !storeConfig) {
                return callback(err || 'store "' + name + '" not found.');
            }
            
            // create store
            factory(cacheKey, storeConfig.adapter, storeConfig.config, callback);
        });
    });
}
