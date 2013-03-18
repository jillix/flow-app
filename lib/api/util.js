var fs = require("fs");
var os = require("os");

function _require(file) {
    
    try {
        return require(file)
    }
    catch (err) {
        if (M.config.logLevel == "debug") {
            console.error("File: " + file + "\n" + err);
        }
        return err;
    }
}

/**
 * description:  generate unique idetifier (uid)
 * author:       Adrian Ottiker
 * date:         14.12.2010
 */
function uid (len) {
    uid = "";
    for (var i = 0, l = len || 24; i < l; ++i) {
        uid += "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[0 | Math.random() * 62];
    }
    return uid;
};

/**
 * description: Hot-load CommonJS Modules (reload module automaticaly if file has changed)
 * author:      Adrian Ottiker
 * date:        22.11.2011
 */
// TODO limit memory usage
function load (file, method) {

    var fileName = file.replace(M.config.APPLICATION_ROOT, "");

    if (!require.cache[file]) {

        // TODO this should only be done when a module is deployed
        var parseError = checkSyntax(file);
        if (parseError) {
            parseError.annotated = parseError.annotated.replace(M.config.APPLICATION_ROOT, "");
            parseError.fileName = file;
            return parseError;
        }

        fs.unwatchFile(file);
        fs.watchFile(file, function(curr, prev) {

            if (curr.mtime.valueOf() != prev.mtime.valueOf()) {

                require.cache[file] = null;
                delete require.cache[file];
                _require(file);
            }
        });
    }

    var result = _require(file);

    if (result instanceof Error) {
        result.fileName = fileName;
        result.message = result.toString();
        result.annotated = result.stack.replace(M.config.APPLICATION_ROOT, "");
        return result;
    }

    return method ? result[method] : result;
};

function checkSyntax(file) {
    var check = require("syntax-error");
    var src = fs.readFileSync(file);
    return check(src, file);
}

/**
 * description:  Load File in Memory and reload it when File changes
 * author:       Adrian Ottiker
 * date:         21.12.2011
 */
// TODO limit memory usage
var fileCache = {};
function read (file, encoding, callback) {
    
    file =  M.config.root + file;
    
    //if (fileCache[file]) {
        
    //    callback(null, fileCache[file]);
    //}
    //else {
        
        fs.readFile(file, encoding, function(err, data) {
        
            if (err) {
                
                callback(err);
            }
            else {
                
                fileCache[file] = data;
                
                fs.unwatchFile(file);
                fs.watchFile(file, function(curr, prev) {
                    
                    // TODO sometimes the files remain unwatched
                    // check the issue at: https://github.com/jillix/mono/issues/24
                    if (curr.mtime.valueOf() != prev.mtime.valueOf() || curr.ctime.valueOf() != prev.ctime.valueOf()) {
                        
                        fs.readFile(file, encoding, function(err, data) {
                            
                            if (err) {
                                
                                fs.unwatchFile(file);
                            }
                            else {
                                
                                fileCache[file] = data;
                            }
                        });
                    }
                });
                
                callback(null, data);
            }
        });
    //}
};

//get ip adress
function ip (version, internal) {
    
    var netIf = os.networkInterfaces();
    
    version = version || 4;
    internal = internal ? true : false;
    
    for (var netIfName in netIf) {
    
        for (var i = 0, l = netIf[netIfName].length; i < l; ++i) {
            
            if (
                netIf[netIfName][i] &&
                netIf[netIfName][i].internal == internal &&
                netIf[netIfName][i].family.toLowerCase() === "ipv" + version &&
                netIf[netIfName][i].address
            ) {
                
               return netIf[netIfName][i].address;
            }
        };
    }
    
    return null;
};

exports.ip = ip;
exports.read = read;
exports.load = load;
exports.uid = uid;
