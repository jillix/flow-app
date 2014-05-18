var M = process.mono;
var fs = require('fs');
var viewCollection = "m_views";

module.exports = setup;

function setup (instance) {
    
    // setup view
    instance.on('view>', factoryService);
    
    // return view factory
    return factory;
}

// get html snipptets (ws)
function getSnipped (path, callback) {
    var self = this;
    
    if (!path) {
        return callback();
    }
    
    path = M.config.paths.TEMPLATE_ROOT + path.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    
    // check cache
    var snippet = M.cache.snippets.get(path);
    if (snippet) {
        return callback(null, snippet);
    }
    
    // read snippet file
    fs.readFile(path, {encoding: 'utf8'}, function (err, data) {
        
        if (err) {
            return callback(err);
        }
        
        // save snippet in cache
        M.cache.snippets.save(path, data);
        
        callback(null, data);
    });
}

function factory (config, callback) {
    var self = this;
     // create cache key
    var cacheKey = (config.project || '') + self.mono.name + config.name;
    
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
        systemStore.collection(viewCollection).findOne({name: config.name, instance: self.mono.name}, function (err, view) {
            
            if (err || !view) {
                return callback(err || 'View "' + config.name + '" of "' + self.mono.name + '" not found');
            }
            
            // get here the html snipped
            getSnipped(view.client.html, function (err, snipped) {
                
                if (err) {
                    return callback(err);
                }
                
                // add snipped to view
                if (snipped) {
                    view.client.html = snipped;
                }
                
                // save view in cache
                M.cache.views.save(cacheKey, view);
                
                callback(null, view);
            });
        });
    });
}

function factoryService (err, message) {
    var self = this;
    
    // check message
    if (!message) {
        return self.emit('<view', 'Bad message'); 
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
    factory.call(self, message, function (err, view) {
        
        if (err) {
            return self.emit('<view', err);
        }
        
        // create client view
        var clientView = view.client;
        clientView.name = view.name;
        clientView.inst = view.instance;
        
        self.emit('<view', null, clientView);
    });
}
