var env = process.env;
var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var object = require(env.Z_PATH_UTILS + 'object');

// export factory method as model (engine specification)
exports.model = factory;

// export query creator (engine specifications)
exports.query = createQuery;

function factory (db, config) {

    // create new model instance
    var model = new EventEmitter();

    // merge dbModel into model
    for (var prop in config) {
        model[prop] = config[prop];
    }

    model.collection = db.collection(config.entity);

    // return model instance (engine specification)
    return model;
}

function createQuery (request) {
    var self = this;

    if (!request.method) {
        return;
    }

    var method = request.method;
    var options = request.options;

    // TODO use modm here
    switch (method) {
        case 'insert':
            method = function (data, callback) {
                self.collection.insert(data.query, data.options || {}, callback);
            };
            break;
        case 'find':
            method = function (data, callback) {
                self.collection.find(data.query, data.options || {}, function (err, cursor) {
                    cursor.toArray(callback);
                });
            };
            break;
        case 'findOne':
            method = function (data, callback) {
                self.collection.findOne(data.query, data.options || {}, callback);
            };
            break;
        case 'findAndModify':
            method = function (data, callback) {
                // TODO check arguments
                self.collection.findAndModify(data.query, (data.options || {}).sort || [], data.doc, data.options || {}, callback);
            };
            break;
        case 'update':
            method = function (data, callback) {
                self.collection.update(data.query, data.doc, data.options || {}, callback);
            };
            break;
        case 'remove':
            method = function (data, callback) {
                self.collection.remove(data.query, callback);
            };
            break;
        case 'count':
            method = function (data, callback) {
                self.collection.count(data.query, callback);
            };
            break;
        default:
            return;
    }

    // remove method key
    delete request.method;

    // return the a query handler for each query
    return function (data, callback) {

        // remove _id from update data
        if (data.query && data.query._id && data.doc && data.doc._id) {
            delete data.doc._id;
        }

        // convert mongodb object ids
        convertObjId(data);

        // call method
        method(data, callback);
    };
}

// convert mongdb object id
function convertObjId (data) {
    if (typeof data === 'object') {
        for (var key in data) {

            if (typeof data[key] === 'string' && data[key][0] === '5' && data[key].length == 24) {
                data[key] = ObjectId(data[key]);
            }

            convertObjId(data[key]);
        }
    }
}
