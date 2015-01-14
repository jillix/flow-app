// ----------------------------------------------------------- SCRIPT LOADER

// CommonJS require
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
        if (modules[name]) {
            return modules[name].exports;
        }
    };
}

// create CommonJS modules in order of the dependencies-
function createCommonJsModulesInOrder (main, moduleSources, callback) {

    // init modules in order (desc)
    for (var i = (moduleSources.length - 1), l = 0; i >= l; --i) {

        // evaluate module script
        if (typeof modules[moduleSources[i]] === fn && !modules[moduleSources[i]]._eval) {

                var module = {
                    id: moduleSources[i],
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
                modules[moduleSources[i]] = modules[moduleSources[i]].call(module.exports, require(module), module, module.exports);
                modules[moduleSources[i]]._eval = true;
        }
    }

    // return first module of dependency list
    callback(null, modules[moduleSources[main]] ? modules[moduleSources[main]].exports : null);
}

// load handler for external dependencies
function extDepLoaded (src) {
    return function () {
        modules[src] = 2;
        cache.I.Z.emit(src);
    };
}

// load scripts (script tag)
function loadJS (moduleName, mainSource, moduleSources, callback) {

    var length = moduleSources.length;
    var modDepLoaded = function () {
        if (--length === 0) {
            createCommonJsModulesInOrder(mainSource, moduleSources, callback);
        }
    };

    for (var i = length - 1, source, url, fingerprint, ext; i >= 0; --i) {

        // split source
        source = moduleSources[i].split('?');

        // get fingerprint
        fingerprint = source[1];

        // remove fingerprint from source
        source = moduleSources[i] = source[0];

        // ingore loading for unified code
        if (source[0] === '#') {
            // remove the control sign
            moduleSources[i] = source.indexOf('./') === 1 ? source.substr(3) : source.substr(1);
            --length;
            continue;
        }

        // load module files
        if (source.indexOf('./') === 0) {
            moduleSources[i] = source = moduleName + source.substr( 2);
        }

        // when script is loaded check if it's evaluated
        cache.I.Z.on(source, modDepLoaded, 1);

        // emit source event for already loaded scripts
        if (modules[source] && modules[source] !== 1) {
            cache.I.Z.emit(source);

        // load module scripts
        } else if (!modules[source]) {
            modules[source] = 1;
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
}