
exports.getModuleUsedVersions = function(callback) {

    var command =
        "SELECT " +
            "in.source AS source, " +
            "in.owner AS owner, " +
            "in.name AS name, "+
            "version " +
        "FROM " +
            "EHasAccessTo";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module versions: " + JSON.stringify(err));
        }

        // duplicate ellimination
        // TODO is there a better way to do this?
        var versions = {};
        for (var i in results) {
            var version = results[i];
            var key = version.source + "/" + version.owner + "/" + version.name + "/" + version.version;
            versions[key] = version;
        }

        // transform back to array
        results = [];
        for (var i in versions) {
            results.push(versions[i]);
        }

        callback(null, results);
    });
};


exports.getModules = function(callback) {

    var command =
        "SELECT " +
            "source, owner, name " +
        "FROM " +
            "VModule";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving modules: " + JSON.stringify(err));
        }

        callback(null, results);
    });
};


exports.addModule = function(module, callback) {

    var command =
        "INSERT INTO VModule (" +
            "source, owner, name, latest" +
        ") VALUES (" +
            "'" + module.source + "', " +
            "'" + module.owner + "', " +
            "'" + module.name + "', " +
            "'" + module.latest + "'" +
        ")";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while inserting module '" + module.getModulePath() + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
    });
};


exports.addModuleVersion = function(module, callback) {

    if (module._id == undefined) {
        return callback("The module is missing the _id.");
    }

    var vmCluster = CONFIG.orient.DB.getClusterByClass("VModule");

    var command =
        "INSERT INTO VModuleVersion (" +
            "version, module, publicDir" +
        ") VALUES (" +
            "'" + module.version + "', " +
            "#" + vmCluster.id + ":" + module._id + ", " +
            "" + null + "" +
        ")";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while inserting module version '" + module.getVersionPath() + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
    });
};


exports.getModule = function(source, owner, name, callback) {

    var command =
        "SELECT " +
        "FROM " +
            "VModule " +
        "WHERE " +
            "source = '" + source + "' AND " +
            "owner = '" + owner + "' AND " +
            "name = '" + name + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module '" + source + "/" + owner + "/" + name + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
    });
};


exports.getModuleVersion = function(module, callback) {

    var command =
        "SELECT " +
        "FROM " +
            "VModuleVersion " +
        "WHERE " +
            "module.source = '" + module.source + "' AND " +
            "module.owner = '" + module.owner + "' AND " +
            "module.name = '" + module.name + "' AND " +
            "version = '" + module.version + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module version '" + module.getVersionPath() + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
    });
};


exports.insertOperations = function(module, callback) {

    if (module._vid == undefined) {
        return callback("The module is missing the _vid. Upsert this module version to obtain a version ID.");
    }

    var operations = module.operations;
    if (!operations || !operations.length) {
        return callback(null, []);
    }

    // build the INSERT VALUES string
    var vvCluster = CONFIG.orient.DB.getClusterByClass("VModuleVersion");
    var opsStr = "";
    for (var i in operations) {
        opsStr += "(#" + vvCluster.id + ":" + module._vid + ", '" + operations[i].file + "', '" + operations[i]["function"] + "'),";
    }
    opsStr = opsStr.slice(0, -1);

    var command =
        "INSERT INTO VOperation (" +
            "module, " +
            "file, " +
            "method" +
        ") VALUES " +
            opsStr;

    sql(command, callback);
};


exports.upsertModule = function(module, callback) {
    // find the module
    exports.getModule(module.source, module.owner, module.name, function(err, mod) {

        if (err) { return callback("Error while upserting (SELECT) module: " + module.getModulePath() + ". Error: " + JSON.stringify(err)); }

        if (mod) {
            module._id = idFromRid(mod['@rid']);
            return callback(null, mod);
        }

        // add the module
        exports.addModule(module, function(err, mod) {

            if (err || !mod) { return callback("Error while upserting (INSERT) module: " + module.getModulePath() + ". Error: " + JSON.stringify(err)); }

            module._id = idFromRid(mod['@rid']);
            callback(null, mod);
        })
    });
}


exports.upsertModuleVersion = function(module, callback) {

    exports.upsertModule(module, function(err, docMod) {

        if (err) { return callback(err); }

        exports.getModuleVersion(module, function(err, versionDoc) {
            
            if (err) { return callback(err); }

            if (versionDoc) {
                module._vid = idFromRid(versionDoc['@rid']);
                return callback(null, versionDoc);
            }

            exports.addModuleVersion(module, function(err, versionDoc) {
            
                if (err) { return callback(err); }

                module._vid = idFromRid(versionDoc['@rid']);
                return callback(null, versionDoc);
            });
        });
    });
};


exports.deleteModuleVersion = function(module, callback) {

    // find the module
    exports.getModule(module.source, module.owner, module.name, function(err, mod) {

        var rid = mod['@rid'];
        var command = "TRAVERSE EHasAccessTo.out FROM (SELECT FROM EHasAccessTo WHERE in = " + rid + ") LIMIT 3";

        sql(command, function(err, results) {

            // TODO add results.length != 2 when checking user rights
            if (err || !results) {
                return callback("Could not delete module version: " + module.relativePath());
            }

            var command =
                "DELETE FROM " +
                    "(TRAVERSE " +
                        "EBelongsTo.out " +
                    "FROM " +
                        "(SELECT FROM EBelongsTo " +
                        "WHERE " +
                            "in = " + rid + " AND " +
                            "version = '" + module.version + "'))";

            sql(command, function(err, results) {

                if (err) {
                    return callback("An error occurred while deleting module version '" + module.relativePath() + "': " + JSON.stringify(err));
                }

                callback(null);
            });
        });
    });
};


exports.getUser = function(appId, userName, callback) {

    var command =
        "SELECT " +
            "@rid AS uid, " +
            "password, " +
            "data " +
        "FROM " +
            "(TRAVERSE roles, VRole.in, EMemberOf.out FROM (SELECT FROM VApplication WHERE id = '" + appId + "')) " +
        "WHERE " +
            "@class = 'VUser' AND " +
            "username = '" + userName + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving the user information for user '" + userName + "': " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback(null, null);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Could not uniquely determine the user with username: " + userName);
        }

        var user = results[0];

        // if the user does not have the required fields
        if (!user || !user.uid) {
            return callback("Missing user ID: " + JSON.stringify(user.uid));
        }
        var uid = idFromRid(user.uid);
        if (uid === null) {
            return callback("Missing user ID: " + JSON.stringify(user.uid));
        }

        user.uid = uid;

        callback(null, { uid: uid, password: user.password, data: user.data || {} });
    });
};


exports.addApplication = function(appId, name, routes, publicDir, errorMiid, callback) {

    // #7:0 should be the default public user
    var command =
        "INSERT INTO VApplication SET " +
            "id = '" + appId + "', " +
            "name = '" + name + "', " +
            "publicDir = '" + publicDir + "', " +
            "publicUser = #7:0, " +
            "error = " + (errorMiid ? "'" + errorMiid + "'" : "null") + ", " +
            "routes = " + JSON.stringify(routes);

    sql(command, function(err, results) {

        if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
            return  callback(err || "Failed to insert application: " + appId + "(" + name + ")");
        }

        var id = idFromRid(results[0]["@rid"]);

        callback(null, id);
    });

}


exports.assignRole = function(uid, rid, callback) {

    callback = callback || function() {};

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");
    var vrCluster = CONFIG.orient.DB.getClusterByClass("VRole");

    var urid = "#" + vuCluster.id + ":" + uid;
    var rrid = "#" + vrCluster.id + ":" + rid;

    var hash = null;
    var options = {
        "class" : "EMemberOf"
    };

    edge(urid, rrid, hash, options, function(err, edgeDoc) {

        if (err) {
            return callback(err);
        }

        callback(null);
    });
}


exports.updatePublicUser = function(appId, uid, callback) {

    callback = callback || function() {};

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    var command =
        "UPDATE Vapplication SET publicUser = #" + vuCluster.id + ":" + uid + " WHERE id = '" + appId + "'";

    sql(command, function(err, results) {

        if (err || !results || results.length != 1 || !results[0]) {
            return  callback(err || "Failed to update the public user for application: " + appId);
        }

        callback(null);
    });
}


exports.addRole = function(appId, name, callback) {

    translateAppId(appId, function(err, id) {

        if (err) {
            return callback(err);
        }

        // first add the Role node
        var command =
            "INSERT INTO VRole SET " +
                "name = '" + name + "', " +
                "app = " + id;

        sql(command, function(err, results) {

            if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
                return  callback(err || "Failed to insert role '" + name + "' for application '" + appId + "'");
            }

            var rid = results[0]["@rid"];
            
            // now add this Role in the application reference list
            var command =
                "UPDATE " + id + " ADD roles = " + rid;

            sql(command, function(err, results) {

                if (err) {
                    return  callback("Failed to insert role '" + rid + "' into application '" + id + "'. " + JSON.stringify(err));
                }

                var id = idFromRid(rid);
                callback(null, id);
            });
        });
    });
};


exports.addUser = function(appId, user, roles, callback) {

    translateAppId(appId, function(err, id) {

        if (err) {
            return callback(err);
        }

        // first add the Role node
        var command =
            "INSERT INTO VUser SET " +
                "username = '" + user.username + "', " +
                "password = '" + user.password + "', " +
                "data = " + JSON.stringify(user.data);

        sql(command, function(err, results) {

            if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
                return  callback(err || "Failed to insert user '" + username + "' for application '" + appId + "'");
            }

            var rid = results[0]["@rid"];
            
            var id = idFromRid(rid);
            callback(null, id);
        });
    });
};


exports.addModuleInstance = function(miid, rid, vid, hash, callback) {

    callback = callback || function() {};

    var vrCluster = CONFIG.orient.DB.getClusterByClass("VRole");
    var vvCluster = CONFIG.orient.DB.getClusterByClass("VModuleVersion");

    var rrid = "#" + vrCluster.id + ":" + rid;
    var vrid = "#" + vvCluster.id + ":" + vid;

    var options = {
        "class" : "EUsesInstanceOf"
    };

    hash.miid = miid;

    // first we add a Uses edge between the role and the version
    edge(rrid, vrid, hash, options, function(err, edgeDoc) {

        if (err) {
            return callback(err);
        }

        var options = {
            "class" : "EHasAccessTo"
        };

        // now we add the Access edge between the role and the version
        edge(rrid, vrid, { miid: miid }, options, function(err, edgeDoc1) {

            if (err) {
                return callback(err);
            }

            callback(null, idFromRid(edgeDoc["@rid"]));
        });
    });
}


exports.addCanPerform = function(miid, rid, operation, params, callback) {

    callback = callback || function() {};

    // find operation id for miid
    getOperationId(rid, miid, operation, function(err, id) {

        if (err) {
            return callback(err);
        }

        var vrCluster = CONFIG.orient.DB.getClusterByClass("VRole");
        var voCluster = CONFIG.orient.DB.getClusterByClass("VOperation");

        var rrid = "#" + vrCluster.id + ":" + rid;
        var orid = "#" + voCluster.id + ":" + id;

        var options = {
            "class" : "ECanPerform"
        };

        var hash = {
            miid: miid
        };
        if (params) {
            hash.params = params;
        }

        // first we add a Uses edge between the role and the version
        edge(rrid, orid, hash, options, function(err, edgeDoc) {

            if (err) {
                return callback(err);
            }

            callback(null, idFromRid(edgeDoc["@rid"]));
        });
    });
}


function getOperationId(rid, miid, name, callback) {

    var vrCluster = CONFIG.orient.DB.getClusterByClass("VRole");
    
    var rrid = "#" + vrCluster.id + ":" + rid;

    var command =
        "SELECT @rid as id FROM VOperation " +
        "WHERE " +
            "method = '" + name + "' AND " +
            "module IN " +
                "(SELECT in FROM EHasAccessTo WHERE out = " + rrid + " AND miid = '" + miid + "')";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while finding operation id for role: " + rrid + " and miid: " + miid + ". " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback("Could not find operation id for role: " + rrid + " and miid: " + miid);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Coould not uniquely identify operation id for role: " + rrid + " and miid: " + miid);
        }
        
        callback(null, idFromRid(results[0].id));
    });
}


function translateAppId(appId, callback) {

    if (typeof appId !== "string") {
        return callback("Invalid application id or rid: " + appId);
    }

    var command =
        "SELECT " +
            "@rid AS id " +
        "FROM " +
            "VApplication " +
        "WHERE " +
            "id = '" + appId + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while translating the application ID: " + appId + ". " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback("Application not found: " + appId);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Could not uniquely determine the application with ID: " + appId);
        }

        var application = results[0];

        // if the application does not have the required fields
        if (!application || !application.id) {
            return callback("Missing application ID: " + JSON.stringify(application));
        }

        callback(null, application.id);
    });
}


exports.getAppId = function(domain, callback) {

        var command =
            "SELECT " +
                "application.id AS appId " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "name = '" + domain + "'";

        sql(command, function(err, results) {

            if (err) {
                return callback("An error occurred while retrieving the application ID for domain '" + domain + "': " + JSON.stringify(err));
            }

            // if there is no result
            if (!results || results.length == 0) {
                return callback("Domain not found: " + domain);
            }

            // if there are too many results
            if (results.length > 1) {
                return callback("Could not uniquely determine the application ID for domain: " + domain);
            }

            var application = results[0];

            // if the application does not have the required fields
            if (!application || !application.appId) {
                return callback("Missing application ID: " + JSON.stringify(application));
            }

            callback(null, application.appId);
        });
};


exports.addApplicationDomains = function(aid, domains, callback) {

    if (!domains || !domains.length) {
        return callback(null);
    }

    // build the INSERT VALUES string
    var vaCluster = CONFIG.orient.DB.getClusterByClass("VApplication");
    var valuesStr = "";
    for (var i in domains) {
        valuesStr += "(#" + vaCluster.id + ":" + aid + ", '" + domains[i] + "'),";
    }
    valuesStr = valuesStr.slice(0, -1);

    var command =
        "INSERT INTO VDomain (" +
            "application, " +
            "name " +
        ") VALUES " +
            valuesStr;

    sql(command, callback);
};


exports.getDomainApplication = function(domain, withRoutes, callback) {

    var command =
        "SELECT " +
            "application.id as appId, " +
            (withRoutes ? "application.routes AS routes, " : "") +
            "application.publicDir AS publicDir, " +
            "application.scripts AS scripts, " +
            "application.css AS css, " +
            "application.name AS title, " +
            "application.error AS errorMiid " +
        "FROM " +
            "VDomain " +
        "WHERE " +
            "name = '" + domain + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving the routing table for domain '" + domain + "': " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback("Domain not found: " + domain);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Could not uniquely determine the application ID for domain: " + domain);
        }

        var application = results[0];

        // if the application does not have the required fields
        if (!application || !application.appId) {
            return callback("The application object is not complete. Check if the application ID is present: " + JSON.stringify(application));
        }

        if (withRoutes && !application.routes) {
            return callback("The application object is not complete. Missing application routing table: " + JSON.stringify(application));
        }

        application.scripts = application.scripts || [];
        application.css = application.css || [];

        callback(null, application);
    });
};


exports.getUserOperation = function(miid, method, userId, callback) {

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    var command =
        "SELECT " +
            "in.out[0].in.source AS source, " +
            "in.out[0].in.owner AS owner, " +
            "in.out[0].in.name AS name, " +
            "in.out[0].version AS version, " +
            "in.file AS file, " +
            "params " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'ECanPerform' AND " +
            "miid = '" + miid + "' AND " +
            "in.method = '" + method + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving the user's operation: " + err);
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback("Operation not found");
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Could not uniquely determine the operation");
        }

        var operation = results[0];

        // is the operation does not have the required fields or an error occurred while retrieving it
        if (!operation || !operation.file) {
            return callback("The operation object is not complete. Missing: operation.file");
        }
        
        callback(null, operation);
    });
};


exports.getModuleConfig = function(appId, miid, userId, callback) {

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "in.source AS source, " +
            "in.owner AS owner, " +
            "in.name AS name, " +
            "version, " +
            "config, html, " +
            "css " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'EUsesInstanceOf' AND " +
            "miid = '" + miid + "'";

    sql(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the module '" + name + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module instance (app: " + appId + "): " + miid);
        }

        if (results.length > 1) {
            return callback("There can be only one module (app: " + appId + "): " + miid + ". Found: " + results.length);
        }

        var module = results[0];
        callback(null, module);
    });
}


exports.getModuleFile = function(source, owner, name, userId, callback) {

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "dir, source, owner, name, latest " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out, EHasAccessTo.in FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'VModule' AND " +
            "source = '" + source + "' AND " +
            "owner = '" + owner + "' AND " +
            "name = '" + name + "'";

    sql(command, function(err, results) {

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


exports.getDomainPublicUser = function(domain, callback) {

    var command =
        "SELECT " +
            "application.publicUser AS publicUser, " +
            "application.id AS appId " +
        "FROM " +
            "VDomain " +
        "WHERE " +
            "name = '" + domain + "'";

    sql(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the public user for domain '" + domain + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such domain: " + domain);
        }

        if (results.length > 1) {
            return callback("There can be only one domain: " + domain + ". Found: " + results.length);
        }

        var app = results[0];

        if (!app || !app.publicUser) {
            return callback("The domain '" + domain + "' has no public user.");
        }

        var rid = app.publicUser;
        var id = idFromRid(rid);

        if (id === null || !app.appId) {
            return callback("Invalid public user ID or application ID for domain '" + domain + "': " + id);
        }

        callback(null, { uid: id, appid: app.appId });
    });
};


function idFromRid(rid) {
    if (typeof rid === "string") {
        var number = parseInt(rid.split(":")[1]);
        if (!isNaN(number)) {
            return number;
        }
    }
    return null;
}


function sql(command, callback) {
    if (CONFIG.log.orientQueries || CONFIG.logLevel === "verbose") {
        console.log(command);
    }
    CONFIG.orient.DB.command(command, callback);
}


function edge(srid, drid, hash, options, callback) {

    var db = CONFIG.orient.DB;

    db.loadRecord(srid, function(err, srecord) {
        db.loadRecord(drid, function(err, drecord) {
            db.createEdge(srecord, drecord, hash, options, callback);
        });
    });
}

