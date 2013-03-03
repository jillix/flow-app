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


exports.getModuleVersionDependencies = function(vid, callback) {

    var vvCluster = CONFIG.orient.DB.getClusterByClass("VModuleVersion");
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

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module version dependencies for '" + vid + "': " + JSON.stringify(err));
        }

        var dependencies = {};

        for (var i in results) {
            var d = results[i];
            dependencies[d.source + "/" + d.owner + "/" + d.name + "/" + d.version] = idFromRid(d.rid);
        }

        callback(null, dependencies);
    });
};


exports.addModuleVersionDependency = function(vid, vidDependency, callback) {

    var vvCluster = CONFIG.orient.DB.getClusterByClass("VModuleVersion");

    var vrid = "#" + vvCluster.id + ":" + vid;
    var vridDependency = "#" + vvCluster.id + ":" + vidDependency;

    var hash = null;
    var options = {
        "class" : "EDependsOn"
    };

    edge(vrid, vridDependency, hash, options, callback);
};


exports.getModuleVersionId = function(module, callback) {

    exports.getModuleVersion(module, function(err, modDoc) {

        if (err) { return callback(err); }
        if (!modDoc) { return callback("Could not find module version in the database: " + module.getVersionPath()); }

        return callback(null, idFromRid(modDoc["@rid"]));
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
    // TODO issue with query parging: for multiple values spaces around the comma are significant
    // https://github.com/nuvolabase/orientdb/issues/1250
    for (var i in operations) {
        opsStr += "(#" + vvCluster.id + ":" + module._vid + ", '" + operations[i].file + "', '" + operations[i]["function"] + "') , ";
    }
    // TODO hence the slice -2
    opsStr = opsStr.slice(0, -2);

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

    // find the module version
    exports.getModuleVersion(module, function(err, modVer) {

        if (err) { return callback(err); }
        if (!modVer) { return callback("Could not find module version in the database: " + module.getVersionPath()); }

        var rid = modVer['@rid'];

        // find incomming role access edges for this module version
        // TODO delete the wrapping SELECT when the following issue is resolved:
        // http://code.google.com/p/orient/issues/detail?id=1018&q=TRAVERSE%20LIMIT
        var command = "SELECT FROM (TRAVERSE in FROM " + rid + ") LIMIT 3";

        sql(command, function(err, results) {

            if (err || !results || results.length < 1) {
                return callback("Could not find module version access rights: " + module.getVersionPath());
            }

            // if we have more than one edges for this module version, we will not delete it
            // TODO in future dev mode, there will probably be development edges
            // and there deleting will be allowed
            if (results.length > 1) {
                return callback("Cannot delete a used module version: " + module.getVersionPath());
            }

            // delete the operations for this module
            var command = "DELETE FROM VOperation WHERE module = " + rid;

            sql(command, function(err, results) {

                if (err) {
                    return callback("An error occurred while deleteing module version operations '" + module.relativePath() + "': " + JSON.stringify(err));
                }

                // now delete the module version
                var command = "DELETE FROM " + rid;

                sql(command, function(err, results) {

                    if (err) {
                        return callback("An error occurred while deleteing module version '" + module.relativePath() + "': " + JSON.stringify(err));
                    }

                    callback(null);
                });
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


exports.addApplication = function(appId, name, routes, publicDir, session, errorMiid, scripts, language, callback) {

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    // VUser:0 should be the default public user
    var publicUserRid = "#" + vuCluster.id + ":0";
    var command =
        "INSERT INTO VApplication SET " +
            "id = '" + appId + "', " +
            "name = '" + name + "', " +
            "publicDir = '" + publicDir + "', " +
            "publicUser = " + publicUserRid + ", " +
            "session = " + session + ", " +
            "error = " + (errorMiid ? "'" + errorMiid + "'" : "null") + ", " +
            "routes = " + JSON.stringify(routes) + ", " +
            "scripts = " + JSON.stringify(scripts) + ", " +
            "language = '" + language + "'";

    sql(command, function(err, results) {

        if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
            return  callback(err || "Failed to insert application: " + appId + "(" + name + ")");
        }

        var id = idFromRid(results[0]["@rid"]);

        // TODO because of a bug in orient 1.1.0 query is not parsed after the first map: routes
        // and therefore the scripts are not saved in the application entry
        var command = "UPDATE " + results[0]["@rid"] + " SET scripts = " + JSON.stringify(scripts);

        sql(command, function(err) {

            if (err) {
                return callback(err || "Failed to insert application scripts for application " + appId + "(" + name + ")");
            }

            callback(null, id);
        });
    });

}


exports.assignRole = function(uid, rid, callback) {

    callback = callback || function() {};

    var urid = ridFromId("VUser", uid);
    var rrid = ridFromId("VRole", rid);

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

    var command =
        "UPDATE Vapplication SET publicUser = " + ridFromId("VUser", uid) + " WHERE id = '" + appId + "'";

    sql(command, function(err, results) {

        if (err || !results || results.length != 1 || !results[0]) {
            return  callback(err || "Failed to update the public user for application: " + appId);
        }

        callback(null);
    });
}


exports.addRole = function(appId, name, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = ridFromId("VApplication", id);

        // first add the Role node
        var command =
            "INSERT INTO VRole SET " +
                "name = '" + name + "', " +
                "app = " + aid;

        sql(command, function(err, results) {

            if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
                return  callback(err || "Failed to insert role '" + name + "' for application '" + appId + "'");
            }

            var rid = results[0]["@rid"];

            // now add this Role in the application reference list
            var command =
                "UPDATE " + aid + " ADD roles = " + rid;

            sql(command, function(err, results) {

                if (err) {
                    return  callback("Failed to insert role '" + rid + "' into application '" + appId + "'. " + JSON.stringify(err));
                }

                callback(null, idFromRid(rid));
            });
        });
    });
};


exports.addUser = function(appId, user, roles, callback) {

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
};


exports.deleteUsers = function(aid, callback) {

    // find first all the RIDs of User nodes and their membership edges
    var command =
        "SELECT " +
            "@rid AS rid " +
        "FROM " +
            "(TRAVERSE VRole.in, EMemberOf.out FROM " +
                "(SELECT FROM VRole WHERE app = " + ridFromId("VApplication", aid) + ") " +
            ") " +
        "WHERE " +
            "@class = 'EMemberOf' OR " +
            "@class = 'VUser'";

    deleteRidsFromCommand(command, function(err) {

        if (err) {
            return callback("Failed to delete users for application with ID " + aid + ": " + JSON.stringify(err)); 
        }

        callback(null);
    });
};


exports.deleteRoles = function(aid, callback) {

    // find first all the RIDs of role nodes and their permission edges
    var command =
        "SELECT " +
            "@rid AS rid " +
        "FROM " +
            "(TRAVERSE out FROM " +
                "(SELECT FROM VRole WHERE app = " + ridFromId("VApplication", aid) + ") " +
            ") ";

    deleteRidsFromCommand(command, function(err) {

        if (err) {
            return callback("Failed to delete roles for application with ID " + aid + ": " + JSON.stringify(err)); 
        }

        callback(null);
    });
};


exports.deleteApplication = function(appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var arid = ridFromId("VApplication", id);

        // check if the application has roles and if it does, do not allow its deletion
        var command = "SELECT FROM VRole WHERE app = " + arid;

        sql(command, function(err, results) {

            if (err) {
                return callback("Failed to delete application " + appId + ": " + JSON.stringify(err));
            }

            if (results && results.length > 0) {
                return callback("Cannot delete application " + appId + " because it still has roles assigned to it. Delete the roles first.");
            }

            // now find all the RIDs of domain nodes and the application node
            var command =
                "DELETE " +
                "FROM " +
                    "VApplication " +
                "WHERE " +
                    "id = '" + appId + "'";

            sql(command, function(err) {

                if (err) {
                    return callback("Failed to delete the application " + appId + ": " + JSON.stringify(err)); 
                }

                callback(null);
            });
        });
    });
}


function deleteRids(rids, callback) {

    if (!(rids instanceof Array) || !rids.length) {
        return callback(null);
    }

    // gather all the RIDs for the DELETE command
    var toDelete = "";
    for (var i in rids) {
        toDelete += rids[i] + ",";
    }
    toDelete = toDelete.slice(0, -1);

    // delete all the users and their membership edges
    command = "DELETE FROM [" + toDelete + "]";

    sql(command, function(err, results) {

        if (err) {
            return callback("Failed to delete RIDs " + JSON.stringify(rids) + ": " + JSON.stringify(err));
        }

        callback(null);
    });
}


function deleteRidsFromCommand(command, callback) {

    sql(command, function(err, results) {

        if (err) { return callback(err); }

        if (!results || !results.length) { return callback(null); }

        var rids = [];
        for (var i in results) {
            if (results[i].rid) {
                rids.push(results[i].rid);
            }
        }

        deleteRids(rids, callback);
    });
}


exports.addModuleInstance = function(miid, rid, vid, hash, callback) {

    callback = callback || function() {};
    hash = hash || {};

    var rrid = ridFromId("VRole", rid);
    var vrid = ridFromId("VModuleVersion", vid);

    var options = {
        "class" : "EUsesInstanceOf"
    };

    // first we add a Uses edge between the role and the version
    edge(rrid, vrid, {miid: miid, config: hash}, options, function(err, edgeDoc) {

        if (err) {
            return callback(err);
        }

        var options = {
            "class" : "EHasAccessTo"
        };

        // now we add the Access edge between the role and the version
        exports.getModuleVersionDependencies(vid, function(err, dependencies) {

            if (err) {
                return callback(err);
            }

            var depIds = [vid];
            for (var key in dependencies) {
                depIds.push(dependencies[key]);
            }

            exports.addRoleAccesses(rid, depIds, function(err) {

                if (err) {
                    return callback(err);
                }

                callback(null, idFromRid(edgeDoc["@rid"]));
            });
        });
    });
};


exports.addRoleAccesses = function(rid, depIds, callback) {

    var vrCluster = CONFIG.orient.DB.getClusterByClass("VRole");
    var vvCluster = CONFIG.orient.DB.getClusterByClass("VModuleVersion");
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

        edge(rrid, vrid, null, options, function(err, edgeDoc) {
            addRoleAccessesSequential(++index);
        });
    }

    addRoleAccessesSequential(0);
};


exports.addCanPerform = function(mvid, miid, rid, operation, params, callback) {

    callback = callback || function() {};

    // find operation id for miid
    getOperationId(mvid, operation, function(err, id) {

        if (err) { return callback(err); }

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


function getOperationId(mvid, name, callback) {

    var vrCluster = CONFIG.orient.DB.getClusterByClass("VRole");
    var vmvCluster = CONFIG.orient.DB.getClusterByClass("VModuleVersion");

    var mvrid = "#" + vmvCluster.id + ":" + mvid;

    var command =
        "SELECT @rid as id FROM VOperation " +
        "WHERE " +
            "method = '" + name + "' AND " +
            "module = '" + mvrid + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while finding operation '" + name + "' for module version: " + mvid + ". " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback("Could not find operation '" + name + "' for module version: " + mvid);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Coould not uniquely identify operation '" + name + "' for module version: " + mvid);
        }
        
        callback(null, idFromRid(results[0].id));
    });
}

/**
 * This translates an appId (a application logical ID, what one finds in a descriptor)
 * into a database internal application id
 */
function translateAppId(appId, callback) {

    if (typeof appId !== "string" && appId.length != 32) {
        return callback("Invalid application id: " + appId);
    }

    var command =
        "SELECT " +
            "@rid AS rid " +
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
        if (!application || !application.rid) {
            return callback("Missing application ID: " + JSON.stringify(application));
        }

        callback(null, idFromRid(application.rid));
    });
}


exports.getApplications = function(callback) {

    var command =
        "SELECT " +
            "* " +
        "FROM " +
            "VApplication";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving the applications: " + JSON.stringify(err));
        }

        var applications = results || [];

        callback(null, applications);
    });
}


exports.getApplication = function(appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var command =
            "SELECT " +
                "* " +
            "FROM " +
                ridFromId("VApplication", id);

        sql(command, function(err, results) {

            if (err) {
                return callback("An error occurred while retrieving the application '" + appId + "': " + JSON.stringify(err));
            }

            // if there is no result
            if (!results || results.length == 0 || !results[0]) {
                return callback("Application not found: " + appId);
            }

            // if there are too many results
            if (results.length > 1) {
                return callback("Could not uniquely determine the application with ID: " + appId);
            }

            var application = results[0];
            application.aid = id;

            callback(null, application);
        });
    });
}


exports.getAppId = function(domain, callback) {

    var command =
        "SELECT " +
            "application.id AS appId, " +
            "application.error AS errorMiid " +
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

        callback(null, application.appId, application.errorMiid);
    });
};

exports.getApplicationDomains = function(appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = ridFromId("VApplication", id);

        var command =
            "SELECT " +
                "name " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "application = " + aid;

        sql(command, function(err, results) {

            if (err) {
                return callback("An error occurred while retrieving the domain for application " + appId + ": " + JSON.stringify(err));
            }

            // if there is no result
            if (!results || results.length == 0) {
                return callback("No domains found for application " + appId);
            }

            var domains = [];
            for (var i in results) {
                domains.push(results[i].name);
            }

            callback(null, domains);
        });
    });
}

exports.deleteApplicationDomains = function(appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = ridFromId("VApplication", id);

        var command =
            "DELETE " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "application = " + aid;

        sql(command, function(err, results) {

            if (err) {
                return callback("An error occurred while deleting the domains for application " + appId + ": " + JSON.stringify(err));
            }

            callback(null);
        });
    });
}

exports.addApplicationDomains = function(aid, domains, callback) {

    if (!domains || !domains.length) {
        return callback(null);
    }

    // build the INSERT VALUES string
    var vaCluster = CONFIG.orient.DB.getClusterByClass("VApplication");
    var valuesStr = "";
    // TODO issue with query parging: for multiple values spaces around the comma are significant
    // https://github.com/nuvolabase/orientdb/issues/1250
    for (var i in domains) {
        valuesStr += "(#" + vaCluster.id + ":" + aid + ", '" + domains[i] + "') , ";
    }
    // TODO hence the slice -2
    valuesStr = valuesStr.slice(0, -2);

    var command =
        "INSERT INTO VDomain (" +
            "application, " +
            "name " +
        ") VALUES " +
            valuesStr;

    sql(command, function(err, results) {
        callback(err);
    });
};


// TODO not used currently
exports.setApplicationStatus = function(appId, status, callback) {

    callback = callback || function() {};

    // save the port in this application
    var command = "UPDATE VApplication SET status = '" + status + "' WHERE id = '" + appId + "'";

    sql(command, function(err) {

        if (err) {
            return callback(err || "Failed set status '" + status + "' for application " + appId);
        }

        callback(null);
    });
};


exports.addApplicationPort = function(appId, port, callback) {

    // if there is another application registered with this port, set its port to 0
    var command = "UPDATE VApplication SET port = 0  WHERE port = " + port + " AND id <> '" + appId + "'";

    sql(command, function(err) {

        if (err) {
            return callback(err || "Failed to remove obsolete ports from other applications.");
        }

        // save the port in this application
        var command = "UPDATE VApplication SET port = " + port + " WHERE id = '" + appId + "'";

        sql(command, function(err) {

            if (err) {
                return callback(err || "Failed to add port for application " + appId);
            }

            callback(null);
        });
    });
};


exports.getDomainApplication = function(domain, withRoutes, callback) {

    var command =
        "SELECT " +
            "application.id AS appId, " +
            "application.port AS port, " +
            (withRoutes ? "application.routes AS routes, " : "") +
            "application.publicDir AS publicDir, " +
            "application.name AS title, " +
            "application.error AS errorMiid, " +
            "application.language AS language " +
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

        //application.scripts = application.scripts || [];
        //application.css = application.css || [];

        callback(null, application);
    });
};


exports.getUserOperation = function(miid, method, userId, callback) {

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    var command =
        "SELECT " +
            "in.module.module.source AS source, " +
            "in.module.module.owner AS owner, " +
            "in.module.module.name AS name, " +
            "in.module.version AS version, " +
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
            "in.module.source AS source, " +
            "in.module.owner AS owner, " +
            "in.module.name AS name, " +
            "in.version AS version, " +
            "config " +
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

        if (!module.source || !module.owner || !module.name || !module.version) {
            return callback("Incomplete module object. Source, owner, name and, version must all be present: " + JSON.stringify(module));
        }

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
            "module.source AS source, " +
            "module.owner AS owner, " +
            "module.name AS name, " +
            "module.latest AS latest " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out, EHasAccessTo.in FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'VModuleVersion' AND " +
            "module.source = '" + source + "' AND " +
            "module.owner = '" + owner + "' AND " +
            "module.name = '" + name + "'";

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

/**
 * Given an Orient RID, this will return the ID in the cluster or null if the 
 * RID is not in the format: #x:y
 */
function idFromRid(rid) {
    if (typeof rid === "string") {
        var number = parseInt(rid.split(":")[1]);
        if (!isNaN(number)) {
            return number;
        }
    }
    return null;
}

/**
 * Given a class name and an ID, 
 */
function ridFromId(className, id) {

    var cluster = CONFIG.orient.DB.getClusterByClass(className);

    if (!cluster || isNaN(id)) {
        return null;
    }

    return "#" + cluster.id + ":" + id;
}


function sql(command, callback) {
    if (CONFIG.log.orientQueries || CONFIG.logLevel === "verbose") {
        console.log(command);
    }
    CONFIG.orient.DB.command(command, callback);
}


function edge(srid, drid, hash, options, callback) {
    var db = CONFIG.orient.DB;
    db.createEdge(srid, drid, hash, options, callback);
}

////////////////////////////////////////////////////////////////////////////////////////////////// this part was originally in db/queries.js

var orient	= CONFIG.orient.DB;
var pongo = new require('pongo')({
    host: CONFIG.mongoDB.host,
    port: CONFIG.mongoDB.port,
    server: {poolSize: 3},
    db: {w: 1}
});

// !----------------------------------------------------------------------------------------

exports.assignRoleToOperation = function( roleID, operationID, callback ){
    orient.addEdge( "5:" + roleID, "5:" + operationID, "CAN_PERFORM", null, callback );
};

exports.unassignRoleFromOperation = function( roleID, callback ){
	orient.removeEdge( "5:" + roleID, "CAN_PERFORM", callback );
};

exports.assignRoleToUIElement = function( comp, view, roleID, UIElementID, data, callback ){
	
	if( comp && view ) {
        
        if( !data ) data = {};
        
        data._comp = comp;
        data._view = view;
        
        orient.addEdge( "5:" + roleID, "5:" + UIElementID, "HAS_ACCESS_TO", data, callback );
    }
    else callback( new Error( "Invalid Data provided." ) );
};

exports.unassignRoleFromUIElement = function( comp, view, roleID, callback ){
	
	// !...
	orient.removeEdge( "5:" + roleID, "HAS_ACCESS_TO", callback );
};

exports.assignUserToRole = function( userID, roleID, callback ){
	orient.addEdge( "5:" + userID, "5:" + roleID, "MEMBER_OF", null, callback );
};

exports.unassignUserFromRole = function( userID, callback ){
	orient.removeEdge( "5:" + userID, "MEMBER_OF", callback );
};

// !----------------------------------------------------------------------------------------

exports.getUserByAuthPub = function( authPub, fields, callback ){
	orient.sql( "select " + fields + " AS pwd from OGraphVertex where klass = 'User' and auth[pub] = '" + authPub + "' limit 1", callback );
};

exports.getUsersOperation = function( operationID, userID, callback ) {
	
	var opid = operationID.replace( /[^0-9]/g, "" );
	
	if( opid ) {
	
		orient.sql(
            "select module,file,method,in[@class = 'ECanPerform'].params as params from #9:" + opid + " where in traverse(5,5) (@rid = #7:" + userID + ")",
            callback
        );
	}
	else callback( new Error( "Invalid Operation ID: " + operationID ) );
};

exports.getUsersUIElements = function( userID, callback ) {
	orient.sql(
        "select _out.name AS name from OGraphEdge where " +
        "_in traverse(3,3) (klass = 'User' and @rid = #5:" + userID + " )"+
        "and _out.klass = 'Module' and _label = 'HAS_ACCESS_TO'", callback
    );
};

exports.getDomainsPublicUser = function(domain, callback) {
	orient.sql(
        "select publicUser from VDomain where name = '" + domain + "'",
        callback
    );
};

// !----------------------------------------------------------------------------------------

exports.getRole = function( roleID, callback ){
	orient.getVertex( "5:" + roleID, "name,desc", callback );
};

exports.insertRole = function( name, desc, callback ){
	orient.addVertex( "OGraphVertex", { name: name, desc: desc, klass: "Role" }, callback );
};

exports.updateRole = function( roleID, data, callback ){
	orient.updateVertex( "5:" + roleID, data, callback );
};

exports.removeRole = function( roleID, callback ){
	orient.removeVertex( "5:" + roleID, callback );
};

// !----------------------------------------------------------------------------------------

exports.getUser = function( userID, fields, callback ){
	orient.getVertex( "5:" + userID, fields, callback );
};

exports.insertUser = function( data, callback ){
	
	if( data ) {
		
		data.klass = "User";
		orient.addVertex( "OGraphVertex", data, callback );
	}
	else callback( new Error( "No Data provided." ) );
};

exports.updateUser = function( userID, data, callback ){
	orient.updateVertex( "5:" + userID, data, callback );
};

exports.removeUser = function( userID, callback ){
	orient.removeVertex( "5:" + userID, callback );
};

// !----------------------------------------------------------------------------------------

exports.getOperation = function( operationID, callback ){
	orient.getVertex( "5:" + operationID, "file,method", callback );
};

exports.insertOperation = function( file, method, callback ){
	orient.addVertex( "OGraphVertex", { file: file, method: method, klass: "Operation" }, callback );
};

exports.updateOperation = function( operationID, data, callback ){
	orient.updateVertex( "5:" + operationID, data, callback );
};

exports.removeOperation = function( operationID, callback ){
	orient.removeVertex( "5:" + operationID, callback );
};

// !----------------------------------------------------------------------------------------

exports.getUIElement = function( UIElementID, callback ){
	orient.getVertex( "5:" + UIElementID, "", callback );
};

exports.insertUIElement = function( data, callback ){
	
	if( data ) {
		
		data.klass = "Module";
		orient.addVertex( "OGraphVertex", data, callback );
	}
	else callback( new Error( "No Data provided." ) );
};

exports.updateUIElement = function( compID, data, callback ){
    orient.updateVertex( "5:" + compID, data, callback );
};

exports.removeUIElement = function( compID, callback ){
    orient.removeVertex( "5:" + compID, callback );
};

// !----------------------------------------------------------------------------------------

exports.updateSession = function( sessionID, doc, callback ){
	
	pongo.connect(CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.update({ sid: sessionID }, doc, callback );
	});
};

exports.endAllUserSessions = function( userID, callback ){
	
	pongo.connect(CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ uid: userID }, callback );
	});
};

exports.endSessions = function( now, callback ){
	
	pongo.connect(CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ exp: { $lt: now } }, callback );
	});
};

exports.endSession = function( sessionID, callback ){
	
	pongo.connect(CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err, null );
		else db.remove({ sid: sessionID }, callback );
	});
};

exports.getSession = function(sessionId, now, expire, callback) {

    pongo.connect(CONFIG.mongoDB.name, "sessions", function(err, db) {

        if (err) { return callback(err); }

        db.findAndModify(
            { sid: sessionId, exp: { $gt: now } },
            [],
            { $set: { exp: expire } },
            { fields: { _id: 0, uid: 1, appid: 1, data: 1, loc: 1 } },
            callback
        );
    });
};

exports.startSession = function(session, callback) {

	pongo.connect(CONFIG.mongoDB.name, "sessions", function(err, db) {

        if (err) { return callback(err) };

        db.insert(session, { safe: true },  callback);
	});
};

// !----------------------------------------------------------------------------------------

exports.checkNonce = function( nonceID, callback ){
	
	var self = this;
	
	pongo.connect(CONFIG.mongoDB.name, "nonces", function( err, db ){
		
		if( err ) callback( err );
		else db.findOne({ n: nonceID, t: { $gt: parseInt( new Date().getTime() / 1000, 5 ) } }, { _id: 0, n: 1}, function( err, nonce ){
			
			if( err ) callback( err );
			else self.removeNonce( nonceID, function( err ){
				
				if( err ) callback( err );
				else callback( null, nonce ? true : false );
			});
		});
	});
};

exports.insertNonce = function(){
	
	pongo.connect(CONFIG.mongoDB.name, "nonces", function( err, db ){
		
		if( err ) callback( err );
		
		else {
			
			var nonce = {
				n: uuid( 13 ),
				t: parseInt( new Date().getTime() / 1000, 10 ) + 10
			};
			
			db.insert( nonce, function( err ){
				
				if( err ) callback( err );
				else callback( null, nonce.n );
			});
		}
	});
};

exports.removeNonce = function( nonceID, callback ){
	
	pongo.connect(CONFIG.mongoDB.name, "nonces", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ n: nonceID }, callback );
	});
};
