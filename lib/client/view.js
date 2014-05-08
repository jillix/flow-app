M.wrap('github/jillix/view/v0.0.1/view.js', function (require, module, exports) {

// TO BE DONE:
// - multiple schemas for a view (ex. a form has i18n content and dynamic content)
// - i18n
// - roled based access and config
// - realtime data
// - caching

var Model = require('./model');
var Template = require('./template');

module.exports = setup;

// setup a view instance
function upsetter (V, config, callback) {
    var self = this;
    var view = {};
    
    if (!config) {
        return;
    }
    
    // init view
    V.template(config.template, function (err, template) {
        
        if (err) {
            return callback.call(self, err);
        }
        
        // add template instance
        view.template = template;

        // init a model
        view.model = V.model;
        
        callback.call(self, null, view);
    });
}

function load (view, callback) {
    var self = this;
    
    if (typeof view === 'object') {
        return upsetter.call(self._mi, self, view, callback);
    }
    
    // load view config
    self._mi.emit('view>', null, view, function (err, config) {
        
        if (err) {
            return callback(err);
        }
        
        upsetter.call(self._mi, self, config, callback);
    });
}

function addDomEvents () {
    // TODO emit routes and inst events on dom event
}

/*
    TODO
    view should be the template which is extended by a model instance
*/
var View = {
    
    // view (former template) methods
    template: function () {},
    render: function () {},
    
    model: function () {
        // TODO fetch model and return it as parameter in the callback
    },
    
    // inherited model properties
    schema: {},
    read: function () {},
    write: function () {},
    update: function () {},
    remove: function () {}
};

function factory (viewConfig) {
    var self = this;
    
    console.log(viewConfig);
    
    // TODO dom events (config.dom)
    // TODO extendable default query (config.query)
    
    var view = M.clone(View);
}

function factoryService (viewInfo, callback) {
    var self = this;
    
    // if no view info is given, create an emtpy view for manual handling
    if (typeof viewInfo === 'function') {
        return viewInfo(null, factory.call(self));
    }
    
    // convert id string to a query object
    if (typeof viewInfo === 'string') {
        viewInfo = {_id: viewInfo};
    }
    
    // query for view
    self.emit('view>', null, viewInfo, function (err, viewConfig) {
        
        if (err) {
            return callback(err);
        }
        
        // TODO pass here the custom store (to access data from a different store)
        
        // create view instance
        factory.call(self, viewConfig);
    });
}

function setup (mi) {
    
    factory.model = Model(mi);
    factory.template = Template(mi);
    factory.load = load;
    factory._mi = mi;
    
    mi.view = factoryService;
    mi.model = Model(mi);
    
    return factory;
}

return module;

});
