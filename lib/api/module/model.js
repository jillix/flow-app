
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
            return callback("An error occurred while retrieving module version '" + module.getVersionPath() + "': " + JSON.stringify(err));
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
            "version, module, publicDir" +
        ") VALUES (" +
            "'" + module.version + "', " +
            "#" + vmCluster.id + ":" + module._id + ", " +
            "" + null + "" +
        ")";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("An error occurred while inserting module version '" + module.getVersionPath() + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
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
        getVersionDependencies(vid, function(err, dependencies) {

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

        for (var i in results) {
            var d = results[i];
            dependencies[d.source + "/" + d.owner + "/" + d.name + "/" + d.version] = M.orient.idFromRid(d.rid);
        }

        callback(null, dependencies);
    });
};

function getConfig (appId, miid, roleId, callback) {

    var vuCluster = M.orient.getClusterByClass("VRole");

    if (!vuCluster) { return callback("Could not find the VRole cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "in.module.source AS source, " +
            "in.module.owner AS owner, " +
            "in.module.name AS name, " +
            "in.version AS version, " +
            "config " +
        "FROM " +
            "(TRAVERSE VRole.out FROM #" + vuCluster.id + ":" + roleId + ") " +
        "WHERE " +
            "@class = 'EUsesInstanceOf' AND " +
            "miid = '" + miid + "'";

    M.orient.sqlCommand(command, function(err, results) {

        // error checks
        if (err) {
            console.log(err);
            return callback("An error occured while retrieving the module '" + miid + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module instance (app: " + appId + "): " + miid);
        }

        if (results.length > 1) {
            return callback("There can be only one module (app: " + appId + "): " + miid + ". Found: " + results.length);
        }

        var module = results[0];

        if (!module.source || !module.owner || !module.name || !module.version) {
            return callback("Incomplete module object. Source, owner, name and, version must all be present: " + JSON.stringify(module));
        }

        callback(null, module);
    });
}

function getFile (source, owner, name, roleId, callback) {

    var vuCluster = M.orient.getClusterByClass("VRole");

    if (!vuCluster) { return callback("Could not find the VRole cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "module.source AS source, " +
            "module.owner AS owner, " +
            "module.name AS name, " +
            "module.latest AS latest " +
        "FROM " +
            "(TRAVERSE VRole.out, EHasAccessTo.in FROM #" + vuCluster.id + ":" + roleId + ") " +
        "WHERE " +
            "@class = 'VModuleVersion' AND " +
            "module.source = '" + source + "' AND " +
            "module.owner = '" + owner + "' AND " +
            "module.name = '" + name + "'";

    M.orient.sqlCommand(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the module '" + source + "/" + owner + "/" + name + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module: " + source + "/" + owner + "/" + name);
        }

        var module = results[0];
        callback(null, module);
    });
}

exports.getConfig = getConfig;
exports.getFile = getFile;

exports.upsert = upsert;
exports.upsertVersion = upsertVersion;

exports.getVersionDependencies = getVersionDependencies;
exports.addVersionDependency = addVersionDependency;
exports.addInstance = addInstance;

exports.addRoleAccesses = addRoleAccesses;

