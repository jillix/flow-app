M.wrap('github/jillix/view/v0.0.1/template.js', function (require, module, exports) {

var Model = require('./model');
var templates = {};
var css = {};

var Template = {
    
    // render data to the html template
    render: function (data, leaveKeys, dontAppend) {
        var self = this;
        
        // check if a template exists
        if (!self._tp) {
            return;
        }
        
        self.html = '';
        data = data || [{}];
        
        // render data
        for (var i = 0; i < data.length; ++i) {
            
            // change data before it gets rendered to the html
            if (typeof self.on.data === 'function') {
                data[i] = self.on.data(data[i]) || data[i];
            }
            
            self.html += self._tp(data[i] || {}, leaveKeys, self._mi);
        }
        
        // change html before writing it to the dom
        if (typeof self.on.html === 'function') {
            self.html = self.on.html(self.html) || self.html;
        }
        
        // write html to dom
        if (!dontAppend && self.dom) {
            self.dom.innerHTML = self.html;
        }
        
        // change html before writing it to the dom
        if (typeof self.on.done === 'function') {
            self.on.done(self);
        }
        
        return self;
    },
    
    // set a template function or a html snippet (which is converted in a template function)
    set: function (template, path) {
        var self = this;
        self._tp = typeof template === 'function' ? template : createTemplate(template, path);
    }
};

module.exports = factory;

function loadCss (urls) {
    if (urls) {
        for (var i in urls) {
            // path are always absolute
            urls[i] = urls[i][0] !== '/' ? '/' + urls[i] : urls[i];
            
            if (!css[urls[i]]) {
                css[urls[i]] = 1;
                
                var link = document.createElement('link');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('href', urls[i]);
                document.head.appendChild(link);
            }
        }
    }
}

function loadHtml (moduleInstance, html, callback) {
    
    // check the html cache
    if (templates[html]) {
        return callback(null, templates[html]);
    }
    
    // load html snippted over websockets
    if (html) {
        return moduleInstance.emit('html>', null, html, callback);
    }
    
    callback(null);
}

function createTemplate (html, path) {
    
    // create template
    // credentials: http://github.com/mood/riotjs/lib/render.js
    html = html.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/'/g, "\\'");
    html = new Function('d','k','i',
        "var v;return '" + html.replace(/\{\s*([\w\.]+)\s*\}/g, "'+("+
        "(v='$1'.indexOf('.')>0?i.path('$1',d):d['$1'])?(v+'')" +
        ".replace(/&/g,'&amp;')" +
        ".replace(/'/g,'&quot;')" +
        ".replace(/</g,'&lt;')" +
        ".replace(/>/g,'&gt;')" +
        ":v===0?0:(k?'{$1}':''))+'") + "'"
    );
    
    if (path) {
        templates[path] = html;
    }
    
    return html;
}

function factory (moduleInstance) {
    return function (config, callback) {
        
        config = config || {};
        
        // append css to the head tag
        loadCss(config.css);
        
        // create template instance
        var template = M.clone(Template);
        template.model = Model(moduleInstance);
        template._mi = moduleInstance;
        template.on = {};
        
        // append custom handlers
        if (config.on) {
            for (var event in config.on) {
                template.on[event] = moduleInstance.path(config.on[event], M);
            }
        }
        
        // save dom target on template
        if (config.to) {
            template.dom = (config.in || document).querySelector(config.to);
        }
        
        // load html template
        if (config.html) {
            loadHtml(moduleInstance, config.html, function (err, templateFn) {
                
                if (err) {
                    return callback.call(moduleInstance, err);
                }
                
                // set template
                if (templateFn) {
                    template.set(templateFn, config.html);
                }
                
                callback.call(moduleInstance, null, template);
            });
            
            return;
        }
        
        if (callback) {
            callback.call(moduleInstance, null, template);
        }
        
        return template;
    };
}

return module;

});
