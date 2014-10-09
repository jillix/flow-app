var env = process.env;
var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');

// crate caches
var pojoStores = cache.pojo('stores', true);
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
function factory (name, role, callback) {

    // get connected store from cache
    var store = pojoStores.get(name, role);

    if (store === 0) {
        return callback(new Error('Store ' + name + ' not found.'));
    }

    if (store) {
        return callback(null, store);
    }

    // set store config from composition files (this checks the cache internall)
    compStores.get(name, role, function (err, comp_store) {

        if (err || !comp_store) {
            return callback(err || new Error('Store ' + name + ' not found.'));
        }

        // check if adpater exists
        if (!adapters[comp_store.adapter]) {
            return callback('Store: adapter "' + comp_store.adapter + '" not found.');
        }

        // require adapter
        if (typeof adapters[comp_store.adapter] === 'string') {
            adapters[comp_store.adapter] = require(adapters[comp_store.adapter]);
        }

        // connect to store
        adapters[comp_store.adapter](env.Z_USER, env.Z_KEY, comp_store.config, function (err, store) {

            if (err) {
                return callback(err);
            }

            // save roles on store
            store._roles = comp_store.roles;

            // save store in cache
            pojoStores.set(name, store);

            callback(err, store);
        });
    });
}
