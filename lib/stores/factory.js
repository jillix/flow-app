var env = process.env;
var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');

// crate caches
var pojoStores = cache.pojo('stores');
var compStores = cache.comp('stores');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

module.exports = factory;

// fetch a store config from the system store
function factory (name, callback) {

    // get connected store from cache
    var store = pojoStores.get(name);
    if (store) {
        return callback(null, store);
    }

    // set store config from composition files (this checks the cache internall)
    compStores.set(name, function (err, store) {

        if (err) {
            return callback(err);
        }

        // check if adpater exists
        if (!adapters[store.adapter]) {
            return callback('store: adapter "' + store.adapter + '" not found.');
        }

        // require adapter
        if (typeof adapters[store.adapter] === 'string') {
            adapters[store.adapter] = require(adapters[store.adapter]);
        }

        // connect to store
        adapters[store.adapter](env.Z_USER, env.Z_KEY, store.config, function (err, store) {

            if (err) {
                return callback(err);
            }

            // save store in cache
            pojoStores.set(name, store);

            callback(err, store);
        });
    });
}
