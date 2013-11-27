var fs = require("fs");
var os = require("os");
var zlib = require('zlib');
var UglifyJS = require('uglify-js');
var check = require('syntax-error');

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

// TODO make checkSyntax async
function checkSyntax(file) {
    var src = fs.readFileSync(file);
    return check(src, file);
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
}

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
        }
    }
    
    return null;
}

// compress and minify files
function compress(files, callback, current) {
    
    var length = files.length;
    current = current || 0;
    
    if (files[current]) {
        
        var type = files[current].split('.').pop();
        
        if (M.config.compressFileTypes[type]) {
            
            fs.readFile(files[current], 'utf8', function(err, data) {
                
                if (err) {
                    return callback(err);
                }
                
                if (type === 'js') {
                    data = UglifyJS.minify(data, {fromString: true}).code;
                }
                
                zlib.gzip(data, function (err, data) {
                    
                    if (err) {
                        return callback(err);
                    }
                    
                    fs.writeFile(files[current], data, function (err) {
                        
                        if (err) {
                            return callback(err);
                        }
                        
                        compress(files, callback, ++current);
                    });
                });
            });
            
        } else {
            compress(files, callback, ++current);
        }
        
    } else {
        callback(null);
    }
}

exports.load = load;
exports.uid = uid;
exports.ip = ip;
exports.compress = compress;
