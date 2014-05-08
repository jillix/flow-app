var M = process.mono;
var fs = require('fs');
var Model = require(M.config.paths.MODELS + 'factory');
var viewCollection = "m_views";

function load (err, viewId) {
    var self = this;
    
    Model.factory({name: 'views'}, function (err, views) {
        
        if (err) {
            return self.emit('<view', err);
        }
        
        views.read({q: {_id: viewId}}, function (err, data) {
            
            if (err || !data || !data[0] || !data[0].client) {
                return self.emit('<view', err || 'no view found: ' + viewId);
            }
            
            self.emit('<view', null, data[0].client);
        });
    });
}

// get html snipptets (ws)
// TODO cache
function html (err, data) {
    var self = this;
    
    if (!data) {
        return self.emit('<html', 'No path given');
    }
    
    var file = M.config.paths.TEMPLATE_ROOT + data.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    fs.readFile(file, {encoding: 'utf8'}, function (err, data) {
        
        if (err) {
            return self.emit('<html', 'File not found');
        }
        
        self.emit('<html', null, data);
    });
}

function factory (config, callback) {
    
     // create cache key
    var cacheKey = (config.project || '') + config.name;
    
    // check cache
    var view = M.cache.views.get(cacheKey);
    if (view) {
        return callback(null, view);
    }
    
    // get system store to fetch models
    M.store(M.config.store.systemStoreName, config.project, function (err, systemStore) {
        
        if (err) {
            return callback(err);
        }
        
        // get view config
        // TODO check access
        systemStore.collection(viewCollection).findOne({name: config.name}, function (err, dbView) {
            
            if (err || !dbView) {
                return callback(err || 'View not found');
            }
            
            // TODO get here the html snipped
            M.store(dbView.store, config.project, function (err, store) {
                
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
                
                // save view in cache
                view = adapters[store._adapter].model(store, dbModel);
                M.cache.views.save(cacheKey, view);
                
                callback(null, models[cacheKey]);
            });
        });
    });
}

function factoryService (err, message) {
    var self = this;
    
    // check message
    if (!message || !message[0]) {
        return self.emit('<model', 'Bad message'); 
    }
    
    // create factory config
    message = {
        name: message[0],
        project: message[1]
    };
    
    // create model
    factory(message, function (err, view) {
        
        if (err) {
            return self.emit('<view', err);
        }
        
        var clientView = {
            _id: view._id,
            name: view.name,
            config: view.config
        };
        
        self.emit('<view', null, clientView);
    });
}

function setup (instance) {
    
    // setup view
    instance.on('view>', factoryService);
    instance.on('html>', html);
    
    // return view factory
    return factory;
}

module.exports = setup;
