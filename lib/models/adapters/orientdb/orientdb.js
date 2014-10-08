var EventEmitter = require('events').EventEmitter;

exports.query = function (request) {

    var self = this;

    return function(data, callback) {
        self._db.exec(request.query, data).then(function (res){
            callback(null, res);
        }, callback);
    };
}

exports.model = function (db, config) {

    // create new model instance
    var model = new EventEmitter();

    // merge dbModel into model
    for (var prop in config) {
        model[prop] = config[prop];
    }

    // TODO Deprecated?
    // model.collection = db.class.get(config.entity)
    model._db = db;

    return model;
};

