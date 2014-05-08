var M = process.mono;
var fs = require('fs');
var modelCollection = 'm_models';
var models = {};

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/model.js';
}

function factory (config, callback) {
    
    // create cache key
    var cacheKey = (config.project || '') + config.name;
    
    // check cache
    if (models[cacheKey]) {
        return callback(null, models[cacheKey]);
    }
    
    // get system store to fetch models
    M.store(M.config.store.systemStoreName, config.project, function (err, systemStore) {
        
        if (err) {
            return callback(err);
        }
        
        // get module entity
        // TODO check access
        systemStore.collection(modelCollection).findOne({name: config.name}, function (err, dbModel) {
            
            if (err || !dbModel) {
                return callback(err || 'Model not found');
            }
            
            M.store(dbModel.store, config.project, function (err, store) {
                
                if (err) {
                    return callback(err);
                }
                
                if (err || !adapters[store._adapter]) {
                    return callback(err || 'Store adapter "' + store._adapter + '" not available.');
                }
                
                // require adapter
                if (typeof adapters[store._adapter] === 'string') {
                    adapters[store._adapter] = require(adapters[store._adapter]);
                }
                
                // save model in cache
                models[cacheKey] = adapters[store._adapter].model(store, dbModel);
                
                callback(null, models[cacheKey]);
            });
        });
    });
}

function factoryService (err, source) {
    var self = this;
    
    factory(source, function (err, model) {
        
        if (err) {
            return self.emit('<model', err);
        }
        
        var clientModel = {
            _id: model._id,
            name: model.name,
            schema: model.schema
        };
        
        self.emit('<model', null, clientModel);
    });
}

// TODO check access here
function messageHandler (method) {
    return function (err, message) {
        var self = this;
        
        if (message && models[message.m]) {
            return models[message.m][method](message, function (err, data) {
                self.emit('<data', err, data);
            });
        }
        
        self.emit('<data', 'Model not found.');
    };
}

function setup (mi) {
    
    // listen for message events
    mi.on('data>', messageHandler);
    mi.on('model>', factoryService);
    
    // export model factory
    mi.model = factory;
}

// export factory
setup.factory = factory;

module.exports = setup;
