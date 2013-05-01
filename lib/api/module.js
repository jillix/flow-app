var fs = require('fs');

var mod_model = require('./module/model');
var mod_client = require('./module/client');
var ops_model = require('./operation/model');


function install (module, callback) {

    // if the module exists, just get it's id (unless it's a "dev" version)
    if (fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {

        // if not the "dev" version, skip this module
        if (module.version !== 'dev') {

            if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                console.log('Skipping ' + module.getVersionPath());
            }
            mod_model.getVersionId(module, function(err, id) {

                if (err) { return callback(err); }

                module._vid = id;

                mod_model.getVersionDependencies(module._vid, callback);
            });

            return;
        }
        // if the "dev" version, always reinstall this module
        else {
            if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                console.log('Reinstalling ' + module.getVersionPath());
            }
            // uninstall first for dev modules
            uninstall(module, function(err) {

                if (err) { return callback(err); }

                // now perform a clean install
                installModuleActions(module, callback);
            });
            return;
        }
    }

    // do the actual installation
    installModuleActions(module, callback);
}

function uninstall (module, callback) {

    mod_model.deleteVersion(module, function(err) {

        if (err) { return callback(err); }

        remove(module, callback);
    });
}

function installModuleActions (module, local, callback) {

    if (typeof local === 'function') {
        callback = local;
        local = false;
    }

    // wrap the callback to perform cleanup on error
    var initialCallback = callback;
    callback = function(err, dependencies, scripts) {

        if (!err) {
            return initialCallback(null, dependencies, scripts);
        }

        if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
            console.error('Module installation error. Removing module: ' + module.getVersionPath());
        }
        remove(module, function(err1) {
            if (err1) {
                return initialCallback(M.error(M.error.API_MOD_CLEANUP_FAILED, module.getVersionPath()));
            }
            initialCallback(err, dependencies, scripts);
        });
    }

    // ***********
    // 1. DOWNLOAD
    // ***********
    if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
        console.log('Fetching module: ' + module.getModulePath() + (local ? ' (local: ' + module.local + ')' : ''));
    }
    fetch(module, local, function(err, isNew) {

        if (err) { return callback(err); }

        // ******************
        // 2. READ DESCRIPTOR
        // ******************
        if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
            console.log('Reading module descriptor: ' + module.getVersionPath());
        }
        readModuleDescriptor(module, function(err, descriptor) {

            if (err) { return callback(err); }

            // the descriptor is a valid descriptor at this point

            // we can start wrapping client scripts in parallel
            if (isNew) {
                // ************************
                // 3.a. WRAP CLIENT SCRIPTS
                // ************************
                if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                    console.log('Wrapping client scripts for module: ' + module.getVersionPath());
                }
                wrapClientScripts(module, descriptor)
            }

            // *************************
            // 3.b. INSTALL DEPENDENCIES
            // *************************
            if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                console.log('Installing dependencies for module: ' + module.getVersionPath());
            }
            installDependencies(module, descriptor, function(err, installedDependencies, scripts) {

                if (err) { return callback(err); }

                // the client script dependencies will be added in the databse for this module version
                module.scripts = scripts;

                // ****************
                // 4. UPSERT MODULE
                // ****************
                if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                    console.log('Upserting module: ' + module.getModulePath());
                }
                mod_model.upsert(module, function(err, modDoc) {

                    if (err) { return callback(err); }
                    
                    // ************************
                    // 5. UPSERT MODULE VERSION
                    // ************************
                    if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                        console.log('Upserting module version: ' + module.getVersionPath());
                    }
                    mod_model.upsertVersion(module, function(err, versionDoc) {

                        if (err) { return callback(err); }

                        // *************************
                        // 6. READ MODULE OPERATIONS
                        // *************************
                        if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                            console.log('Reading module operations from: ' + module.getVersionPath() + '/' + M.config.MODULE_DESCRIPTOR_NAME);
                        }
                        readModuleOperations(module, function(err, operations) {

                            if (err) { return callback(err); };

                            module.operations = operations;

                            // ***************************
                            // 7. INSERT MODULE OPERATIONS
                            // ***************************
                            if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                                console.log('Inserting ' + operations.length + ' operations for module: ' + module.getVersionPath());
                            }
                            ops_model.insertOperations(module, function(err, inserted) {

                                if (err) { return callback(err); };

                                if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                                    console.log('Inserted ' + inserted.length + ' operations for module: ' + module.getVersionPath());
                                }

                                // ********************
                                // 8. LINK DEPENDENCIES
                                // ********************
                                if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                                    console.log('Adding dependency links: ' + module.getVersionPath() + '/' + M.config.MODULE_DESCRIPTOR_NAME);
                                }
                                addDependencyLinks(module, descriptor, installedDependencies, function(err) {

                                    if (err) { return callback(err); };

                                    callback(null, installedDependencies, scripts);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function wrapClientScripts (module, descriptor, callback) {

    callback = callback || function() {};

    var scripts = [];

    for (var i in descriptor.dependencies) {

        var dep = descriptor.dependencies[i];

        // a module script must start with only one slash
        if (dep[0] === '/' && dep[1] !== '/') {
                scripts.push(dep);
        }
    }

    for (var i in scripts) {
        (function (i) {
            mod_client.wrapScript(module, scripts[i], function(err) {
                var path = module.getVersionPath() + scripts[i];
                if (err) {
                    console.error('Failed to wrap client script: ' + path);
                } else if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                    console.log('Wrapped module client script: ' + path);
                }
            });
        })(i);
    }
}

function readModuleOperations (module, callback) {

    fs.readFile(M.config.MODULE_ROOT + module.getVersionPath() + '/' + M.config.MODULE_DESCRIPTOR_NAME, function (err, data) {

        if (err) {
            return callback(M.error(M.error.API_MOD_INVALID_DESCRIPTOR, module.getVersionPath(), 'Error while reading the ' + M.config.MODULE_DESCRIPTOR_NAME + ' file'));
        }

        // transform from buffer to string
        data = data.toString();

        // an empty file is a valid file
        if (data.trim() === '') {
            return callback(null, []);
        }

        // parse the file and find the operations, if any
        var mono = {};
        try {
            mono = JSON.parse(data);
        } catch (err) {
            console.dir(err);
            return callback(M.error(M.error.API_MOD_INVALID_DESCRIPTOR, module.getVersionPath(), JSON.stringify(err)));
        }

        callback(null, mono.operations || []);
    });
}

function readModuleDescriptor (module, callback) {

    // if the module version does not exists, throw error 
    if (!fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {
        return callback(M.error(M.error.API_MOD_NOT_FOUND, module.getVersionPath()));
    }

    var file = M.config.MODULE_ROOT + module.getVersionPath() + '/' + M.config.MODULE_DESCRIPTOR_NAME;

    M.fs.readJsonFile(file, function(err, descriptor) {

        if (err) {
            if (M.error.isApi(err)) {
                return callback(err);
            }
            return callback(M.error(M.error.API_MOD_INVALID_DESCRIPTOR, module.getVersionPath(), JSON.stringify(err)));
        }

        // TODO validate descriptor

        callback(null, descriptor);
    });
}

function installDependencies (module, descriptor, callback) {

    // just call back if there are no dependencies
    if (!descriptor.dependencies || !descriptor.dependencies.length) {
        return callback(M.error(M.error.API_MOD_INVALID_DESCRIPTOR, module.getVersionPath(), 'a module must have at least it\'s main script as dependency'));
    }

    // gather all dependencies in this array: strings for 
    var scripts = [];

    for (var i in descriptor.dependencies) {

        var dep = descriptor.dependencies[i];

        // it starts with a slash, so it is either internal or external script
        if (dep[0] === '/') {
            // is it an external URL written in the form //ajax.google.com/...
            if (dep[1] === '/') {
                scripts.push([dep]);
            }
            // it is an internal script, so write it in the SONV form
            else {
                scripts.push([module.getVersionPath() + dep]);
            }
        }
        // it could be a module dependency gut also still an external script
        else {
            // still external
            if (dep.indexOf('://') !== -1) {
                scripts.push([dep]);
            }
            // and finally a module dependency
            else {
                scripts.push(dep);
            }
        }
    }

    var count = scripts.length;
    var index = 0;
    var dependencies = {};

    function installDependenciesSequential(index) {

        if (index >= count) {
            return callback(null, dependencies, flattenWithoutDuplicates(scripts));
        }

        // go to next entry if not a module dependency
        if (typeof scripts[index] !== 'string') {
            return installDependenciesSequential(++index);
        }

        // build a module object
        var splits = scripts[index].split('/');
        var module = new exports.Module(splits[0], splits[1], splits[2], splits[3]);

        // call install on this child module
        install(module, function(err, installedDependencies, scriptDependencies) {

            if (err) { return callback(err); }

            // add this module to the dependency list
            dependencies[module.getVersionPath()] = module._vid;

            // add the script dependency list of this module
            scripts[index] = scriptDependencies;

            // add sub-dependencies to this app dependencies
            for (var key in installedDependencies) {
                dependencies[key] = installedDependencies[key];
            }

            installDependenciesSequential(++index);
        });
    }

    installDependenciesSequential(index);
}

function addDependencyLinks (module, descriptor, installedDependencies, callback) {

    var depKeys = Object.keys(installedDependencies);
    var count = depKeys.length;

    // just call back if there are no dependencies
    if (!count) {
        return callback(null);
    }

    var index = 0;

    function addDependencyLinksSequential(index) {

        if (index >= count) {
            return callback(null);
        }

        var key = depKeys[index];
        var depId = installedDependencies[key];

        mod_model.addVersionDependency(module._vid, depId, function(err) {

            if (err) {
                return callback(M.error(M.error.API_MOD_INSTALLATION_FAILED, module.getVersionPath(), 'Could not add dependency link to module version: ' + key));
            }

            addDependencyLinksSequential(++index);
        })
    }

    addDependencyLinksSequential(index);
}

function remove (module, callback) {
    var dirName = M.config.MODULE_ROOT + module.getVersionPath();
    M.fs.removeDirectory(dirName, callback);
}

function fetch (module, local, callback) {

    if (typeof local === 'function') {
        callback = local;
        local = false;
    }

    // if this commit version is already present give up
    if (fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {
        return callback(null, false);
    }

    // from here on we are sure the module is a new one so we have to report back this
    function modifiedCallback (err) {
        if (err) {
            return callback(err);
        }
        // the module is new so we will have to do some more processing: wrap, minify, zip
        callback(err, true);
    }

    addDirectory(module.source, module.owner, module.name, function(err) {

        if (err) { return callback(err); }

        // if local installation, copy the module
        if (local) {
            M.fs.copyDirectory(module.local, M.config.MODULE_ROOT + module.getVersionPath(), { createParents: false },  modifiedCallback);
        }
        // else clone from the web
        else {
            cloneVersion(module, modifiedCallback);
        }
    });
}

/*
 * This must receive an array of arrays and returns a flatten array with
 * backward duplicate elimination.
 */
function flattenWithoutDuplicates (scripts) {

    var flatScripts = [];

    // flatten scripts array
    for (var i in scripts) {
        // all elements of the scripts array shpud be other arrays
        if (scripts[i] instanceof Array) {
            for (var j in scripts[i]) {
                flatScripts.push(scripts[i][j]);
            }
        } else {
            flatScripts.push(scripts[i]);
        }
    }

    var duplicateObject = {};
    for (var i = flatScripts.length - 1; i >=0; --i) {
        // duplicate
        if (duplicateObject[flatScripts[i]]) {
            flatScripts[i] = undefined;
            continue;
        }
        // not duplicate
        duplicateObject[flatScripts[i]] = true;
    }

    // add again the scripts to the final array but without duplicates
    var nodupScripts = [];
    for (var i in flatScripts) {
        if (flatScripts[i]) {
            nodupScripts.push(flatScripts[i]);
        }
    }

    return nodupScripts;
}

function addDirectory(source, owner, module, callback) {

    var dirName = M.config.MODULE_ROOT + source + '/' + owner + '/' + module;
    M.fs.makeDirectory(dirName, callback);
}

function cloneVersion (module, callback) {

    var url = module.getSourceUrl();

    if (!url) {
        return callback(M.error(M.error.API_MOD_INVALID_SOURCE_URL, module.getVersionPath()));
    }

    var dirName = M.config.MODULE_ROOT + module.getModulePath();
    var version = module.version;

    // clone the repo now from url, in the target directory, in a directory having the version name
    if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
        console.log('Cloning module from ' + url + ' into ' + dirName + '/' + version);
    }
    M.repo.cloneToDir(url, dirName, version, { depth: 1 }, function(err) {

        if (err) { return callback(err) };

        // reset to this version
        M.repo.checkoutTag(dirName + '/' + version, version, callback);
    });
}

/*******************************************************/
/*********************** exports ***********************/
/*******************************************************/

exports.Module = function(source, owner, name, version) {

    source = source || '';
    owner = owner || '';
    name = name || '';
    version = version || 'latest'

    function getModulePath() {
        return source + '/' + owner + '/' + name;
    }
    
    function getVersionPath() {
        return getModulePath() + '/' + version;
    }
    
    function getSourceUrl() {
        
        // over HTTPS
        switch (source) {
            case 'github':
                return 'https://github.com/' + owner + '/' + name + '.git';
            case 'bitbucket':
                var credentials = '';

                if (name.indexOf('liqshop') == 0) {
                    credentials += 'gabipetrovay:mEmphis0@';
                } else if (owner === 'jillix') {
                    credentials += 'gabipetrovay:mEmphis0@'
                }

                return 'https://' + credentials + 'bitbucket.org/' + owner + '/' + name.toLowerCase() + '.git';
            default:
                return null;
        }
        
        // over SSH
        /*switch (source) {
            case 'github':
                return 'git@github.com:' + owner + '/' + name + '.git';
            case 'bitbucket':
                return 'git@bitbucket.org:' + owner + '/' + name + '.git';
            default:
                return null;
        }*/
    }

    return {
        source: source,
        owner: owner,
        name: name,
        version: version,

        getModulePath: getModulePath,
        getVersionPath: getVersionPath,
        getSourceUrl: getSourceUrl
    }
};

exports.install = install;
exports.uninstall = uninstall;
exports.remove = remove;
exports.fetch = fetch;

exports.getConfig = mod_model.getConfig;
exports.getFile = mod_model.getFile;
exports.minify = mod_client.minify;
