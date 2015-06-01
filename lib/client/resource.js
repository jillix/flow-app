(function (global, body) {

// reset scripts cache on reload
//engine.on('reload', function () {
//    engine._scripts = {};
//});

// TODO make resource loader event free.. (use script cach to attach load check handler)

/**
 * Wrapper function for CommonJS modules.
 *
 * @public
 * @param {string} The complete file path.
 * @param {function} The wrapper function, which returns the module object
 */
var engine = global.E = function Engine (path, module) {
    
    // create CommonJS module directly if path is not loaded from a dependency list.
    if (!moduleCache[path]) {
        moduleCache[path] = module;
        createCommonJSModule(path);
    
    // emit path as event to create CommonJS modules in order,
    // after all resources are loaded.
    } else {
        var checkLoaded = moduleCache[path];
        moduleCache[path] = module;
        checkLoaded();
        //engine.emit(path);
    }
};

// module cache
var moduleCache = {};

// constants
var isPublicPath = /^\/[^/]/;
var checkFp = /\.@[a-z0-9]{7}\.(?:js|css|html)$/i;

/**
 * Load module scripts depedencies.
 *
 * @public
 * @param {array} The file paths.
 * @param {object} The module instance.
 * @param {function} The callback handler.
 */
engine.load = function (scripts, module_instance, callback) {

    // get the number of scripts
    var length = scripts.length;

    // ensure callback
    callback = callback || function () {};

    // create CommonJS module, when all scrips are loaded
    function moduleLoaded () {
        if (--length === 0) {
            evaluateScriptsInOrder(scripts, module_instance, callback);
        }
    }

    // loop through scripts
    for (var i = length - 1, url, cleanPath; i >= 0; --i) {

        url = cleanPath = scripts[i];

        if (checkFp.test(url)) {

            // split path
            cleanPath = url.split('.');

            // remove fingerprint from read path
            cleanPath.splice(cleanPath.length - 2, 1);

            // create path without fingerprint
            cleanPath = cleanPath.join('.');
        }

        // append public file prefix
        if (isPublicPath.test(cleanPath)) {
            url = '/!' + url;

        // append module file prefix
        } else if (url.indexOf('://') < 0 && url.indexOf('//') !== 0) {
            url = '/@/@/' + url;

        // handle external files, that must be wrapped
        } else if (url[0] === '#') {
            url = '/@/@/!/' + url.substr(1) + '?w=1';
            cleanPath = cleanPath.substr(1);
        }

        // overwrite script path with path without fingerprints
        scripts[i] = cleanPath;

        // pipe fileLoaded event stream to checkLoaded event stream,
        // to check when all scripts are evaluated
        // engine.on(cleanPath, moduleLoaded, 1);

        // emit source event for already loaded scripts
        if (moduleCache[cleanPath] && moduleCache[cleanPath] !== moduleLoaded) {
            moduleLoaded();
            //engine.emit(cleanPath);

        // load module scripts
        } else if (!moduleCache[cleanPath]) {

            // create script cache entry
            moduleCache[cleanPath] = moduleLoaded;

            // crate script dom elemeent
            var node = body.createElement('script');

            // set url and append dom script elm to the document head
            node.src = url;
            body.head.appendChild(node);
        }
    }
};

/**
 * Initialize CommonJS modules in order of the dependencies.
 *
 * @private
 * @param {object} .
 */
function evaluateScriptsInOrder (scripts, module_instance, callback) {

    // init modules in order (desc)
    for (var i = (scripts.length - 1), l = 0; i >= l; --i) {

        // evaluate module script
        if (typeof moduleCache[scripts[i]] === 'function' && !moduleCache[scripts[i]]._eval) {
            createCommonJSModule(scripts[i]);
        }
    }

    // extend module instance with exported module methods
    for (var prop in moduleCache[scripts[0]].exports) {
        module_instance[prop] = moduleCache[scripts[0]].exports[prop];
    }

    // return module instance
    callback();
}

/**
 * Evaluate/create CommonJS module.
 *
 * @public
 * @param {string} The script path.
 */
function createCommonJSModule(script) {
    
    var module = {
        id: script,
        exports: {}
    };

    var path = module.id.split('/');
    module.file = path.pop();
    module.base = path.join('/');

    // execute CommonJS module
    moduleCache[script] = moduleCache[script].call(module.exports, require(module), module, module.exports, global, engine);
    moduleCache[script]._eval = true;
}

function getNearestModulePath (module, name) {

    var path = '';

    // separate module name and path
    if (name.indexOf('/') > 0) {
        path = name.split('/');
        name = path.shift();
        path = path.join('/');
    }

    // TODO find a way to require a module without version
    /*var version = '0.1.0';
    var main = '';
    var versionMap = {
        view: {
            v: '0.1.0',
            m: 'main/file.js',
            s: {
                moduleName: {
                  v: '0.1.0',
                  m: 'trucken/client.js'
            }
        ]
    };

    for (var moduleId in versionMap) {

    }*/

    return  name + '@' + version + '/' + (path || main || 'index.js');
}

/**
 * The CommonJS require function.
 *
 * @private
 * @param {object} The module object.
 */
function require (module) {
    return function (name) {

        // handle different path types
        switch (name.indexOf('./')) {

            // external module
            case -1:

                // get the path from the module version relative to the base
                //name  = getNearestModulePath(module, name);
                break;

            // relative forward
            case 0:
                // ...create path with module base
                name = module.base + '/' + name.substr(2);
                break;

            // relative backward
            case 1:
                // ...create path with module base
                name = name.split('../');
                var stepsBack = name.length;
                var basePath = module.base.split('/');

                // return if module path is exceeded
                if (basePath.length < stepsBack) {
                    return;
                }

                // create new path
                name = basePath.slice(0, (stepsBack - 1) * -1).join('/') + '/' + name.pop();
        }

        name += name.slice(-3) !== '.js' ? '.js' : '';

        if (moduleCache[name]) {
            return moduleCache[name].exports;
        }
    };
}

})(this, document);
    
    
    
    
    
    
    