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
// TODO cache
function getSnipped (path, callback) {
    var self = this;
    
    if (!path) {
        return callback('No path given');
    }
    
    var file = M.config.paths.TEMPLATE_ROOT + path.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    fs.readFile(file, {encoding: 'utf8'}, function (err, data) {
        
        if (err) {
            return callback('File not found');
        }
        
        callback(null, data);
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
        systemStore.collection(viewCollection).findOne({name: config.name}, function (err, view) {
            
            if (err || !view) {
                return callback(err || 'View not found');
            }
            
            // get here the html snipped
            getSnipped(view.client.template.html, function (err, snipped) {
                
                if (err) {
                    return callback(err);
                }
                
                // add snipped to view
                if (snipped) {
                    view.client.template.html = snipped;
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
    factory(message, function (err, view) {
        
        if (err) {
            return self.emit('<view', err);
        }
        
        // create client view
        var clientView = view.client;
        clientView.name = view.name;
        
        self.emit('<view', null, clientView);
    });
}
