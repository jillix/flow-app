var EventEmitter = require('events').EventEmitter;

function request (data, callback) {
    var self = this;
    var method = data.m;

    switch (method) {
        case 'find':
            self.collection.then(function (docs) {
                return docs.list();
            }).then(function (results) {
                callback(null, results);
            }, function (err) {
                callback(err);
            }).done();
            break;
        case 'query':
            self._db.query(data.q).then(function (res) {
                callback(null, res);
            }, function (err) {
                callback(err);
            }).done();
            break;
        default:
            callback('Method not found.');
    }
}

// export factory method as model (mono specification)
exports.model = function (db, config) {

    // create new model instance
    var model = new EventEmitter();

    // merge dbModel into model
    for (var prop in config) {
        model[prop] = config[prop];
    }

    model.collection = db.class.get(config.entity)
    model._db = db;

    // request method (mono specification)
    model.request = request;

    // return model instance (mono specification)
    return model;
}
