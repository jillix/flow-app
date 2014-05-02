var M = process.mono;
var fs = require('fs');

// TODO make this configs configurable
var systemStoreApiKey = 'systemStore';
var storesCollection = 'm_stores';
var adapatersPath = __dirname + '/adapters/';

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
function fetchStore (name, callback) {
    
    // check is system store exists
    if (!M[systemStoreApiKey]) {
        return callback('store factory not ready.');
    }
    
    // get store model (mongodb)
    var collection = M[systemStoreApiKey].collection(storesCollection);
    collection.findOne({name: name}, function (err, storeConfig) {
        
        if (err || !storeConfig) {
            return callback(err || 'store "' + name + '" not found.');
        }
        
        // create store
        factory(storeConfig.adapter, storeConfig.config, callback);
    });
}

// setup store factory
function setup (adapter, config, callback) {
    
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
