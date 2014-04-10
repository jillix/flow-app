var M = process.mono;
var fs = require('fs');

// TODO make this configs configurable
var systemStoreApiKey = 'systemStore';
var storeModelId = '';
var adapatersPath = __dirname + '/adapters/';

// adapter cache
var adapters = {};

// read available store adapters
var availableAdapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var adapterFolderName in availableAdapters) {
    adapters[adapterFolderName] = adapatersPath + adapterFolderName;
}

module.exports = factory;

// create a new store
function factory (adapter, config, callback) {
    
    // check is system store exists
    if (!M[systemStoreApiKey]) {
        return callback('store factory not ready.');
    }
    
    // check if adpater exists
    if (!adapters[config.adapter]) {
        return callback('store: adapter "' + config.adapter + '" not found.');
    }
    
    // require adapter
    if (typeof adapters[config.adapter] === 'string') {
        adapters[config.adapter] = require(adapters[config.adapter]);
    }
    
    // connect to store
    adapters[config.adapter].connect(config, callback);
}

// fetch a store config from the system store
function fetchStore (name, callback) {
    
    // get store model
    M.systemStore.model(storeModelId, function (err, model) {
        
        if (err) {
            return callback(err);
        }
        
        // read store config
        model.read({name: name}, function (err, config) {
            
            if (err) {
                return callback(err);
            }
            
            // create store
            factory(config, callback);
        });
    });
}

// setup store factory
function setup (config, callback) {
    
    // create system store
    factory(config, function (err, store) {
        
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
