var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var Model = new EventEmitter();

exports.model = factory;

function factory (db, config) {
    
    // create new model instance
    var model = Model.clone();
    
    // merge dbModel into model
    for (var prop in config) {
        model[prop] = config[prop];
    }
    
    model.source = db.collection(config.entity);
    
    return model;
}

Model.command = function (method, query, callback) {
    var self = this;
    
    if (!query || (!query.q && !query.d)) {
        return callback('Bad request');
    }

    // remove _id from update data
    if (query.q && query.q._id && query.d && query.d._id) {
        delete query.d._id;
    }
    
    convertObjId(query);
    
    // TODO use modm here
    switch (method) {
        case 'create':
            self.source.insert(query.d, query.o || {}, callback);
            break;
        case 'read':
            self.source.find(query.q, query.o || {}, callback);
            break;
        case 'update':
            self.source.update(query.q, query.d, query.o || {}, callback);
            break;
        case 'delete':
            self.source.remove(query.q, callback);
            break;
    }
};
Model.create = function (query, callback) {
    var self = this;
    self.command('create', query, function (err, data) {

        if (err) {
            return callback.call(self, err);
        }
        
        callback.call(self, 0, data);
    });
};
Model.read = function (query, callback) {
    var self = this;
    
    self.command('read', query, function (err, data) {
        if (err) {
            return callback.call(self, callback, err);
        }

        data.toArray(function (err, data) {
            
            if (err) {
                return callback.call(self, err);
            }
            
            callback.call(self, 0, data);
        });
    });
};
Model.update = function (query, callback) {
    var self = this;
    self.command('update', query, function (err, data) {

        if (err) {
            return callback.call(self, err);
        }
        
        callback.call(self, 0, 1);
    });
};
Model['delete'] = function (query, callback) {
    var self = this;
    self.command('delete', query, function (err, data) {

        if (err) {
            return callback.call(self, err);
        }

        callback.call(self, 0, data);
    });
};

//////////////////////////////////////////////////

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
