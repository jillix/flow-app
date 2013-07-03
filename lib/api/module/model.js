var colMiids = M.db.collection('miids');
var colMods = M.db.collection('modules');
var colRoles = M.db.collection('roles');

function upsert (module, callback) {

    // find the module
    get(module.source, module.owner, module.name, function(err, mod) {

        if (err) { return callback("Error while upserting (SELECT) module: " + module.getModulePath() + ". Error: " + JSON.stringify(err)); }

        if (mod) {
            module._id = M.orient.idFromRid(mod['@rid']);
            return callback(null, mod);
        }

        // add the module
        add(module, function(err, mod) {

            if (err || !mod) { return callback("Error while upserting (INSERT) module: " + module.getModulePath() + ". Error: " + JSON.stringify(err)); }

            module._id = M.orient.idFromRid(mod['@rid']);
            callback(null, mod);
        })
    });
}

function upsertVersion (module, callback) {

    upsert(module, function(err, docMod) {

        if (err) { return callback(err); }

        getVersion(module, function(err, versionDoc) {

            if (err) { return callback(err); }

            if (versionDoc) {
                module._vid = M.orient.idFromRid(versionDoc['@rid']);
                return callback(null, versionDoc);
            }

            addVersion(module, function(err, versionDoc) {
            
                if (err) { return callback(err); }

                module._vid = M.orient.idFromRid(versionDoc['@rid']);
                return callback(null, versionDoc);
            });
        });
    });
};

function get (source, owner, name, callback) {

    var command =
        "SELECT " +
        "FROM " +
            "VModule " +
        "WHERE " +
            "source = '" + source + "' AND " +
            "owner = '" + owner + "' AND " +
            "name = '" + name + "'";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module '" + source + "/" + owner + "/" + name + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
    });
};

function add (module, callback) {

    var command =
        "INSERT INTO VModule (" +
            "source, owner, name, latest" +
        ") VALUES (" +
            "'" + module.source + "', " +
            "'" + module.owner + "', " +
            "'" + module.name + "', " +
            "'" + module.latest + "'" +
        ")";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("An error occurred while inserting module '" + module.getModulePath() + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
    });
};

/*
 * Returns a version object or null if no such version has been found.
 */
function getVersion (module, callback) {

    var command =
        "SELECT " +
        "FROM " +
            "VModuleVersion " +
        "WHERE " +
            "module.source = '" + module.source + "' AND " +
            "module.owner = '" + module.owner + "' AND " +
            "module.name = '" + module.name + "' AND " +
            "version = '" + module.version + "'";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, command, JSON.stringify(err)));
        }

        callback(null, results[0] || null);
    });
};

function addVersion (module, callback) {

    if (module._id == undefined) {
        return callback("The module is missing the _id.");
    }

    var vmCluster = M.orient.getClusterByClass("VModule");

    var command =
        "INSERT INTO VModuleVersion (" +
            "version, module, scripts" +
        ") VALUES (" +
            "'" + module.version + "', " +
            "#" + vmCluster.id + ":" + module._id + ", " +
            JSON.stringify(module.scripts) +
        ")";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, command, JSON.stringify(err)));
        }

        callback(null, results[0] || null);
    });
};

function deleteVersion (module, callback) {

    // find the module version
    getVersion(module, function(err, modVer) {

        if (err) { return callback(err); }

        if (!modVer) {
            return callback(M.error(M.error.API_MOD_VERSION_NOT_FOUND, module.getVersionPath()));
        }

        var rid = modVer['@rid'];

        // find incomming role access edges for this module version
        // TODO delete the wrapping SELECT when the following issue is resolved:
        // http://code.google.com/p/orient/issues/detail?id=1018&q=TRAVERSE%20LIMIT
        var command = "SELECT FROM (TRAVERSE in FROM " + rid + ") LIMIT 3";

        M.orient.sqlCommand(command, function(err, results) {

            if (err) {
                return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, command, JSON.stringify(err)));
            }

            if (!results || results.length < 1) {
                return callback(M.error(M.error.API_MOD_VERSION_NOT_FOUND, module.getVersionPath()));
            }

            // if we have more than one edges for this module version, we will not delete it
            // TODO in future dev mode, there will probably be development edges
            // and there deleting will be allowed
            if (results.length > 1) {
                return callback(M.error(M.error.API_MOD_UNINSTALL_FAILED, module.getVersionPath(), 'cannot delete used module version'));
            }

            // delete the operations for this module
            var command = "DELETE FROM VOperation WHERE module = " + rid;

            M.orient.sqlCommand(command, function(err, results) {

                if (err) {
                    return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, command, JSON.stringify(err)));
                }

                // now delete the module version
                var command = "DELETE FROM " + rid;

                M.orient.sqlCommand(command, function(err, results) {

                    if (err) {
                        return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, command, JSON.stringify(err)));
                    }

                    callback(null);
                });
            });
        });
    });
};

function addInstance (miid, rid, vid, hash, callback) {

    callback = callback || function() {};
    hash = hash || {};

    var rrid = M.orient.ridFromId("VRole", rid);
    var vrid = M.orient.ridFromId("VModuleVersion", vid);

    var options = {
        "class" : "EUsesInstanceOf"
    };

    // first we add a Uses edge between the role and the version
    M.orient.createEdge(rrid, vrid, { miid: miid, config: hash }, options, function(err, edgeDoc) {

        if (err) {
            return callback(err);
        }

        var options = {
            "class" : "EHasAccessTo"
        };

        // now we add the Access edge between the role and the version
        getVersionDependencies(vid, function(err, dependencies, scripts) {

            if (err) {
                return callback(err);
            }

            var depIds = [vid];
            for (var key in dependencies) {
                depIds.push(dependencies[key]);
            }

            addRoleAccesses(rid, depIds, function(err) {

                if (err) {
                    return callback(err);
                }

                callback(null, M.orient.idFromRid(edgeDoc["@rid"]));
            });
        });
    });
};

function addRoleAccesses (rid, depIds, callback) {

    var vrCluster = M.orient.getClusterByClass("VRole");
    var vvCluster = M.orient.getClusterByClass("VModuleVersion");
    var rrid = "#" + vrCluster.id + ":" + rid;

    var options = {
        "class" : "EHasAccessTo"
    };

    var index = 0;
    
    function addRoleAccessesSequential(index) {

        if (index >= depIds.length) {
            return callback(null);
        }

        var vrid = "#" + vvCluster.id + ":" + depIds[index];

        M.orient.createEdge(rrid, vrid, null, options, function(err, edgeDoc) {
            addRoleAccessesSequential(++index);
        });
    }

    addRoleAccessesSequential(0);
};

function addVersionDependency (vid, vidDependency, callback) {

    var vvCluster = M.orient.getClusterByClass("VModuleVersion");

    var vrid = "#" + vvCluster.id + ":" + vid;
    var vridDependency = "#" + vvCluster.id + ":" + vidDependency;

    var hash = null;
    var options = {
        "class" : "EDependsOn"
    };

    M.orient.createEdge(vrid, vridDependency, hash, options, callback);
};

function getVersionDependencies (vid, callback) {

    var vvCluster = M.orient.getClusterByClass("VModuleVersion");
    var vrid = "#" + vvCluster.id + ":" + vid;

    var command =
        "SELECT " +
            "@rid AS rid, " +
            "module.source AS source, " +
            "module.owner AS owner, " +
            "module.name AS name, " +
            "version " +
        "FROM " +
            "(TRAVERSE VModuleVersion.out, EDependsOn.in FROM " + vrid + ") " +
        "WHERE @class = 'VModuleVersion' AND @rid <> " + vrid;

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module version dependencies for '" + vid + "': " + JSON.stringify(err));
        }

        var dependencies = {};
        var scripts = [];

        for (var i in results) {
            var d = results[i];
            dependencies[d.source + "/" + d.owner + "/" + d.name + "/" + d.version] = M.orient.idFromRid(d.rid);
        }

        getVersionScriptDependencies(vid, function(err, scripts) {

            if (err) { return callback(err); }

            callback(null, dependencies, scripts);
        });
    });
}

function getVersionScriptDependencies (vid, callback) {

    var vvCluster = M.orient.getClusterByClass("VModuleVersion");
    var vrid = "#" + vvCluster.id + ":" + vid;

    var command =
        "SELECT " +
            "scripts " +
        "FROM " +
            "VModuleVersion " +
        "WHERE " +
             "@rid = " + vrid;

    M.orient.sqlCommand(command, function(err, results) {

        if (err || !results || !results[0]) {
            return callback("An error occurred while retrieving module version script dependencies for '" + vid + "': " + JSON.stringify(err));
        }

        var scripts = results[0].scripts;

        callback(null, scripts);
    });
}

function getVersionId (module, callback) {

    getVersion(module, function(err, modDoc) {

        if (err) { return callback(err); }
        if (!modDoc) { return callback("Could not find module version in the database: " + module.getVersionPath()); }

        return callback(null, M.orient.idFromRid(modDoc["@rid"]));
    });
};

function getConfig (miid, roleId, callback) {

    var queryMiid = {
        application: M.config.app.id,
        miid: miid,
        roles: parseInt(roleId, 10)
    };

    colMiids.findOne(queryMiid, {fields: {_id:0, config:1, module:1, version: 1}}, function (err, miid) {
        
        if (err) {
            return callback(M.error(M.error.DB_MONGO_QUERY_ERROR, command, JSON.stringify(err)));
        }
        
        if (!miid) {
            return callback(M.error(M.error.API_MIID_NOT_FOUND, queryMiid.miid));
        }

        var queryMod = {
            _id: miid.module,
            'versions.version': miid.version
        };

        colMods.findOne(queryMod, {fields: {_id: 0, name: 1, owner: 1, source: 1, 'versions.$.deps': 1}}, function (err, module) {

            if (err) {
                return callback(M.error(M.error.DB_MONGO_QUERY_ERROR, command, JSON.stringify(err)));
            }

            if (!module) {
                return callback(M.error(M.error.API_MOD_NOT_FOUND, queryMiid.miid));
            }
            
            if (!module.source || !module.owner || !module.name || !miid.version) {
               return callback(M.error(M.error.DB_MONGO_INVALID_RECORD, 'module', JSON.stringifyi(module))); 
            }
            
            // append the miid scripts (defined by the application) to the end of the array
            // this way they will be loaded first
            if (miid.config && miid.config.scripts && module.versions[0].deps) {
                miid.config.scripts = module.versions[0].deps.concat(miid.config.scripts);
            }

            // add modle path to config
            miid.config.path = module.source + '/' + module.owner + '/' + module.name + '/' + miid.version,

            callback(null, miid.config);
        });
    });
}

// TODO module path to module id
function getFile (module, roleId, callback) {
    
    var query = {
        application: M.config.app.id,
        id: parseInt(roleId, 10),
        // TODO get module id
        modules: module
    };
    
    colRoles.findOne(query, {fields: {_id: 1}}, function (err, found) {
        
        if (err) {
            // TODO hande with M.error
            return callback('An error occured while retrieving the module "' + module + '": ' + err);
        }

        if (!found) {
            // TODO handle with M.error
            return callback("No such module: " + module);
        }
        
        callback(null, found);
    });
}

exports.getConfig = getConfig;
exports.getFile = getFile;

exports.upsert = upsert;
exports.upsertVersion = upsertVersion;
exports.deleteVersion = deleteVersion;

exports.getVersionId = getVersionId;
exports.getVersionDependencies = getVersionDependencies;
exports.addVersionDependency = addVersionDependency;
exports.addInstance = addInstance;

exports.addRoleAccesses = addRoleAccesses;

