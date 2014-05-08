var M = process.mono;
var fs = require('fs');
var Model = require('./model');

// TODO this should be dynamic! make it configurable in the instance config
var viewsModelId = "53078ea7e266dbc030ef891b";

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
    
    // create view instance
    // cache view instance
    // get model (_id: modelId)
    // init template
}

function factoryService (err, viewQuery) {
    var self = this;
    // check cache
    
    // ..or load model and query view
    
    self.model(viewsModelId, function (err, views) {
        
        if (err) {
            return self.emit('<view', err);
        }
        
        // TODO get view config
        views.read({q: viewQuery}, function (err, data) {
            
            if (err || !data) {
                self.emit('<view', err || 'no view found');
            }
            
            self.emit('<view', null, data);
        });
    });
}

function setup (mi, viewModel) {
    
    // setup model on instance
    Model(mi);
    
    // setup view
    mi.on('view>', load);
    //mi.on('view>', factoryService);
    mi.on('html>', html);
    
    // export view factory
    mi.view = factory;
}

module.exports = setup;
