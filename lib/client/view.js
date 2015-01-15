
var View = {

    // render data to the html template
    render: function (data, dontEscape, leaveKeys, dontAppend) {
        var self = this;
        var escape_fn;

        // check if a template exists
        if (!self.tpl) {
            return;
        }

        self.html = '';
        self.data = data = data || [{}];

        // render data
        for (var i = 0, rData; i < data.length; ++i) {

            // change data before it gets rendered to the html
            if (typeof self.on.data === 'function') {
                rData = self.on.data.call(self, data[i]) || data[i];
            }

            // create html
            self.html += self.tpl(rData || data[i], default_escape_fn, dontEscape || self.dontEscape, leaveKeys || self.leaveKeys);
        }

        // change html before writing it to the dom
        if (typeof self.on.html === 'function') {
            self.html = self.on.html(self.html) || self.html;
        }

        if (typeof self.dom === 'string') {
            self.dom = (self.scope || doc).querySelector(self.dom);
        }

        // render html
        if (!dontAppend && self.dom) {
            self.dom.innerHTML = self.html;
        }

        // append dom events
        if (self.flow) {
            flow.call(self._, self.flow, false, self, self.dom, self.data);
        }

        // change html before writing it to the dom
        if (typeof self.on.done === 'function') {
            self.on.done(self);
        }
    },

    // set a template function or a html snippet
    set: function (html, dom, scope) {

        // create template function
        this.tpl = createTemplate(html);
        this.scope = scope;
        this.dom = dom;
    }
};

function factory (view, config, index) {
    var self = this;

    // load css files
    loadCss(config.css);

    // add instance reference
    view._ = self;

    // dont escape html default config
    view.dontEscape = config.dontEscape;

    // leave keys in template default config
    view.leaveKeys = config.leaveKeys;

    // append custom handlers
    view.on = {};
    if (config.on) {
        for (var event in config.on) {
            view.on[event] = self._path(config.on[event]);
        }
    }

    // set html template
    if (config.html) {
        view.set(config.html, config.to, config['in']);
    }

    // save observer action config for later use after rendering
    view.flow = config.flow;

    // add infos for nested views
    view.nested = config.nested;

    // save view in instance
    self.view[config.name] = view;

    // save render order on instance
    self._renderOrder[index] = config.name;
}

var template_escape = {"\\": "\\\\", "\n": "\\n", "\r": "\\r", "'": "\\'"};
var render_escape = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

// escape html chars
function default_escape_fn (data, key, dont_escape_html, leaveKeys) {

    // get the string value
    str = key.indexOf('.') > 0 ? Z._path(key, data) : data[key];

    // if str is null or undefined
    str = str == null ? (leaveKeys ? key : '') : str;

    // render a nested view
    if (typeof str === 'object' && this.nested && this._.view[this.nested[key]]) {
        var view = this._.view[this.nested[key]];

        // render nested view and don't append to the dom
        view.render(str, dont_escape_html, leaveKeys, true);

        // get html of rendered view
        str = view.html;

        // don't escape html chars
        dont_escape_html = true;

    // make sure str is a string
    } else {
        str += '';
    }

    // escape html chars
    if (!dont_escape_html) {
        return str.replace(/[&\"<>]/g, function(_char) {
            return render_escape[_char];
        });
    }

    return str;
}

// create a template function
// heavily inspired by the https://github.com/muut/riotjs render method
function createTemplate (tmpl) {
    return new Function("_", "f", "e", "k", "_=_||{};return '" +
        (tmpl || '').replace(/[\\\n\r']/g, function(_char) {
            return template_escape[_char];
        }).replace(/{\s*([\w\.]+)\s*}/g, "' + f.call(this,_,'$1',e,k) + '") + "'"
    );
}

/**
 * Render data to a view.
 *
 * @param {object} event - The engine event object.
 * @param {object} data - The event data object.
 *
 * @emits jillix/layout#renderError
 * @emits jillix/layout#renderDone
 */
function render (event, data) {
    var self = this;
    var view = data.view;
    data = data.data;

    if (!self.view || !self.view[view] || !data) {

        /**
         * This event is emitted, when rendering fails.
         *
         * @event jillix/layout#renderError
         * @type {object}
         */
        return self.emit('renderError', event, new Error('View "' + view + '" don\'t exists.'));
    }

    // TODO Handle pages on manual rendering
    // data.item && (data.item.page = '_page_' + self._name);

    // push a single item to an array
    if (!(data instanceof Array)) {
        data = [data];
    }

    // render data
    self.view[view].render(data);

    /**
     * This event is emitted, after successfull rendering.
     *
     * @event jillix/layout#renderDone
     * @type {object}
     */
    self.emit('renderDone', event, self.view[view]);
}
