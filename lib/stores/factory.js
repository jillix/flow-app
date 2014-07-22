var env = process.env;

var fs = require('fs');
var model = require(env.Z_PATH_MODELS + 'factory');
var cache = require(env.Z_PATH_CACHE + 'cache');

var systemStoreConfig = JSON.parse(env.Z_STORE_CONFIG);

// crate caches
var storesCache = cache('stores');
var cmpsStores = cache('cmps_stores', {store: env.Z_PATH_PROCESS_COMPOSITION + 'stores/'});

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

module.exports = fetchStore;

// fetch a store config from the system store
function fetchStore (storeName, callback) {

    var store = storesCache.get(storeName);
    if (store) {
        return callback(null, store);
    }

    // get system store
    if (storeName === env.Z_STORE_SYSTEM) {
        return factory(env.Z_STORE_SYSTEM, env.Z_STORE_ADAPTER, systemStoreConfig, function (err, store) {

            if (err || !store) {
                return callback(err);
            }

            callback(err, store);
        });
    }

    var store_cmps = cmpsStores.get(storeName, function (err, store) {

        if (err) {
            return callback(err);
        }

        // create store
        factory(storeName, dbStore.adapter, dbStore.config, callback);
    });


    // get store model
    model.factory(env.Z_STORE_STORES_MODEL, function (err, stores) {

        if (err) {
            return callback(err);
        }

        // find store
        stores.request({m: 'findOne', q: {name: storeName}}, function (err, dbStore) {

            if (err || !dbStore) {
                return callback(err || 'store "' + storeName + '" not found.');
            }

            // create store
            factory(storeName, dbStore.adapter, dbStore.config, callback);
        });
    });
}

// create a new store
function factory (storeName, adapter, config, callback) {

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
        storesCache.set(storeName, store);

        callback(err, store);
    });
}
