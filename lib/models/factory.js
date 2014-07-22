// TODO create a model from a local config object. not from a store config
var env = process.env;

var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');
var storeFactory = require(env.Z_PATH_STORES + 'factory');

var pojoModels = cache.pojo('models');
var compModels = cache.comp('models');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

var events = {
    ask: 'M>',
    send: '<M',
    req: 'm>',
    res: '<m'
};

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

exports.setup = setup;
exports.factory = factory;

function setup (instance) {

    // listen for message events
    instance.on(events.req, messageHandler);
    instance.on(events.ask, factoryService);
}
function factory (name, callback) {

    // check cache
    var model = pojoModels.get(name);
    if (model) {
        return callback(null, model);
    }

    // get model config from composition store
    compModels.set(name, function (err, model) {

        // get connected store
        storeFactory(model.store, function (err, store) {

            if (err) {
                return callback(err);
            }

            if (err || !adapters[model.adapter]) {
                return callback(err || new Error('Model adapter "' + model.adapter + '" not available.'));
            }

            // require adapter
            if (typeof adapters[model.adapter] === 'string') {
                adapters[model.adapter] = require(adapters[model.adapter]);
            }

            // save model in cache
            model = adapters[model.adapter].model(store, model);
            pojoModels.set(name, model);

            callback(null, model);
        });
    });
}

function factoryService (err, name) {
    var self = this;

    // check message
    if (!name) {
        return self.emit(events.send, 'Bad message');
    }

    // send the model schema to the client
    factory(name, function (err, model) {

        if (err) {
            return self.emit(events.send, err);
        }

        var clientModel = {
            name: model.name,
            schema: model.schema
        };

        self.emit(events.send, null, clientModel);
    });
}

// TODO check access here
function messageHandler (err, message) {
    var self = this;

    // check message
    if (!message || !message.m || !message.d) {
        return self.emit(events.res, 'Bad message');
    }

    // get model from cache
    var model = pojoModels.get(message.m);
    if (!model) {
        return self.emit(events.res, 'Model not found.');
    }

    // do model request
    model.request(message.d, function (err, data) {
        self.emit(events.res, err, data);
    });
}
