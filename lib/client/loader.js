// observer module
(function (global, body, state) {

    var engine = global.E;

    // script cache
    engine.scripts = {};

    // css cache
    engine.csss = {};

    /**
     * Load css files.
     *
     * @public
     * @param {array} The array containing css file urls.
     */
    engine.css = function (urls) {

        for (var i in urls) {
            if (!engine.csss[urls[i]]) {
                engine.csss[urls[i]] = 1;

                var link = doc.createElement('link');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('href', urls[i]);
                doc.head.appendChild(link);
            }
        }
    };

    /**
     * Load module scripts and depedencies.
     *
     * @public
     * @param {string} The name of the module.
     * @param {number} The index of the main module script.
     * @param {array} The module script paths.
     * @param {function} The callback handler, which returns the module object.
     */
    engine.load = function (moduleName, scripts, callback) {

        // get the number of scripts
        var length = scripts.length;

        // create CommonJS module, when all scrips are loaded
        var modDepLoaded = function () {
            if (--length === 0) {
                createCommonJsModulesInOrder(scripts, callback);
            }
        };

        // loop through scripts
        for (var i = length - 1, source, url, fingerprint, ext; i >= 0; --i) {

            // split script path
            source = scripts[i].split('?');

            // get fingerprint
            fingerprint = source[1];

            // remove fingerprint from source
            source = scripts[i] = source[0];

            // ingore loading for unified code
            if (source[0] === '#') {
                // remove the control sign
                scripts[i] = source.indexOf('./') === 1 ? source.substr(3) : source.substr(1);
                --length;
                continue;
            }

            // load module files
            if (source.indexOf('./') === 0) {
                scripts[i] = source = moduleName + source.substr( 2);
            }

            // when script is loaded check if it's evaluated
            engine.on(source, modDepLoaded, 1);

            // emit source event for already loaded scripts
            if (engine.scripts[source] && engine.scripts[source] !== 1) {
                engine.emit(source);

            // load module scripts
            } else if (!engine.scripts[source]) {
                engine.scripts[source] = 1;
                var node = doc.createElement('script');

                // check if it's an external source
                if ((ext = source.indexOf('//') > -1)) {
                    node.onload = extDepLoaded(source);
                }

                // create module script url
                url = source[0] === '/' ? source : '/@/Z/M/' + source;

                // add fingerprint to the url
                node.src = ext ? url : url.replace(/\.js$/, '.' + fingerprint + '.js');
                doc.head.appendChild(node);
            }
        }
    };

    // load handler for external dependencies
    /**
     * Create a new module instance.
     *
     * @private
     * @param {object} The object, which is extended with the observable methods.
     */
    function extDepLoaded (src) {
        return function () {
            engine.scripts[src] = 2;
            engine.emit(src);
        };
    }

    /**
     * Initialize CommonJS modules in order of the dependencies.
     *
     * @private
     * @param {object} .
     */
    function createCommonJsModulesInOrder (scripts, callback) {

        // init modules in order (desc)
        for (var i = (scripts.length - 1), l = 0; i >= l; --i) {

            // evaluate module script
            if (typeof engine.scripts[scripts[i]] === fn && !engine.scripts[scripts[i]]._eval) {

                    var module = {
                        id: scripts[i],
                        exports: {}
                    };

                    module.path = module.id.split('/');
                    module.file = module.path.pop();

                    if (module.id.indexOf('//') === 0) {

                        module.base = '//';
                        module.path = module.path.slice(2);

                    } else if (module.id[0] === '/') {

                        module.base = '/';
                        module.path = module.path.slice(1);

                    } else if (module.id.indexOf('://') > 0) {

                        module.base = module.path.slice(0,3).join('/') + '/';
                        module.path = module.path.slice(3);

                    } else {

                        module.base = module.path.slice(0,4).join('/') + '/';
                        module.path = module.path.slice(4);
                    }

                    // execute CommonJS module
                    engine.scripts[scripts[i]] = engine.scripts[scripts[i]].call(module.exports, require(module), module, module.exports);
                    engine.scripts[scripts[i]]._eval = true;
            }
        }

        // return first module of dependency list
        callback(null, engine.scripts[scripts[0]] ? engine.scripts[scripts[0]].exports : null);
    }

    /**
     * The CommentJS require function.
     *
     * @private
     * @param {object} The module object.
     */
    function require (module) {
        return function (name) {
            if (name.indexOf('../') === 0) {

                var namePath = name.split('../');
                var stepBackLenght = namePath.length - 1;
                namePath = namePath.pop();

                name = module.base + (module.path.length === stepBackLenght ? namePath : module.path.slice(0, stepBackLenght).join('/') + '/' + namePath);

            } else if (name.indexOf('./') === 0) {
                var path = module.path.join('/');
                name = module.base + (path ? path + '/' : '') + name.substr(2);
            }

            name += name.slice(-3) !== '.js' ? '.js' : '';
            if (engine.scripts[name]) {
                return engine.scripts[name].exports;
            }
        };
    }

// pass environment
})(this, document, location);
