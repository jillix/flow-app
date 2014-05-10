var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var Model = new EventEmitter();

// export factory method as model (mono specification)
exports.model = factory;

function factory (db, config) {
    
    // create new model instance
    var model = Model.clone();
    
    // merge dbModel into model
    for (var prop in config) {
        model[prop] = config[prop];
    }
    
    model.collection = db.collection(config.entity);
    
    // request method (mono specification)
    model.request = request;
    
    // return model instance (mono specification)
    return model;
}

function request (data, callback) {
    var self = this;
    var method = data.m;
    
    if (!data.q && !data.d) {
        return callback('Bad request');
    }

    // remove _id from update data
    if (data.q && data.q._id && data.d && data.d._id) {
        delete data.d._id;
    }
    
    convertObjId(data);
    
    // TODO use modm here
    switch (method) {
        case 'insert':
            self.collection.insert(data.d, data.o || {}, callback);
            break;
        case 'find':
            self.collection.find(data.q, data.o || {}, function (err, cursor) {
                
                cursor.toArray(function (err, data) {
            
                    if (err) {
                        return callback(err);
                    }
                    
                    callback(0, data);
                });
            });
            break;
        case 'findOne':
            self.collection.findOne(data.q, data.o || {}, callback);
            break;
        case 'findAndModify':
            // TODO check arguments
            self.collection.findAndModify(data.q, data.d, data.o || {}, callback);
            break;
        case 'update':
            self.collection.update(data.q, data.d, data.o || {}, callback);
            break;
        case 'remove':
            self.collection.remove(data.q, callback);
            break;
    }
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
