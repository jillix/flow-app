var M = process.mono;
var fs = require('fs');
var modelCollection = 'm_models';
var models = {};

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

module.exports = setup;

function setup (instance) {
    
    // listen for message events
    instance.on('model_req>', messageHandler);
    instance.on('model>', factoryService);
    
    // return model factory
    return factory;
}

function factory (config, callback) {
    
    // create cache key
    var cacheKey = (config.project || '') + config.name;
    
    // check cache
    var model = M.cache.models.get(cacheKey);
    if (model) {
        return callback(null, model);
    }
    
    // get system store to fetch models
    M.store(M.config.store.systemStoreName, config.project, function (err, systemStore) {
        
        if (err) {
            return callback(err);
        }
        
        // get module entity
        // TODO check access self.link.session.role
        systemStore.collection(modelCollection).findOne({name: config.name}, {fields: {_id: 0}}, function (err, dbModel) {
            
            if (err || !dbModel) {
                return callback(err || 'Model not found');
            }
            
            M.store(dbModel.store, config.project, function (err, store) {
                
                if (err) {
                    return callback(err);
                }
                
                if (err || !adapters[dbModel.adapter]) {
                    return callback(err || 'Model adapter "' + dbModel.adapter + '" not available.');
                }
                
                // require adapter
                if (typeof adapters[dbModel.adapter] === 'string') {
                    adapters[dbModel.adapter] = require(adapters[dbModel.adapter]);
                }
                
                // save model in cache
                model = adapters[dbModel.adapter].model(store, dbModel);
                M.cache.models.save(model);
                
                callback(null, model);
            });
        });
    });
}

function factoryService (err, message) {
    var self = this;
    
    // check message
    if (!message) {
        return self.emit('<model', 'Bad message'); 
    }
    
    // create factory config
    if (typeof message === 'string') {
        message = {name: message};
    } else {
        message = {
            name: message[0],
            project: message[1]
        };
    }
    
    // create model
    factory(message, function (err, model) {
        
        if (err) {
            return self.emit('<model', err);
        }
        
        var clientModel = {
            name: model.name,
            schema: model.schema
        };
        
        self.emit('<model', null, clientModel);
    });
}

// TODO check access here
function messageHandler (err, message) {
    var self = this;
    
    // check message
    if (!message || !message.m || !message.d) {
        return self.emit('<model_req', 'Bad message');
    }
    
    // get model from cache
    var model = M.cache.models.get(message.m);
    if (!model) {
        return self.emit('<model_req', 'Model not found.');
    }
    
    // do model request
    model.request(message.d, function (err, data) {
        self.emit('<model_req', err, data);
    });
}
