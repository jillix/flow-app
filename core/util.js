var fs = require( "fs" );

function _require(file) {
    
    try {
        
        return require(file)
    }
    catch (err) {
        
        if (CONFIG.dev) {
            
            console.log("File: " + file + "\n" + err);
        }
        
        return err;
    }
}

/**
 * description:  generate universal unique idetifier ( uuid )
 * author:       Adrian Ottiker
 * date:         14.12.2010
 */
this.uuid = function(len, uuid) {
        
    uuid = "";
    
    for(var i = 0, l = len || 23; i < l; ++i) {
        
        uuid += "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[0 | Math.random() * 62];
    }
    
    return uuid;
};

/**
 * description:  Buffers streamed Data and release them when resume function is called
 * author:       Adrian Ottiker
 * date:         22.11.2011
 * example:
 *  var resume = pause(req);
 *  resume(true|undefined);
 */
this.pause = function(req) {
    
    var onData, onEnd,
        events = [];
    
    // buffer data
    req.on('data', onData = function( data, encoding ) {
    
        events.push([ 'data', data, encoding ]);
    });
    
    // buffer end
    req.on('end', onEnd = function( data, encoding ) {
    
        events.push([ 'end', data, encoding ]);
    });
    
    return function(abort) {
        
        req.removeListener('data', onData);
        req.removeListener('end', onEnd);
        
        if (abort) {
            
            events = null;
        }
        else {
            
            for(var i = 0, l = events.length; i < l; ++i) {
            
                req.emit.apply(req, events[i]);
            }
            
            events = null;
        }
    };
};

/**
 * description: Hot-load CommonJS Modules (reload module automaticaly if file has changed)
 * author:      Adrian Ottiker
 * date:        22.11.2011
 */
// TODO limit memory usage
this.load = function(file, method) {
    
    if (!require.cache[file]) {
        
        fs.unwatchFile(file);
        fs.watchFile(file, function(curr, prev) {
            
            if (curr.mtime.valueOf() != prev.mtime.valueOf()) {
                
                require.cache[file] = null;
                delete require.cache[file];
                _require(file);
            }
        });
    }
    
    return method ? _require(file)[method] : _require(file);
};

/**
 * description:  Load File in Memory and reload it when File changes
 * author:       Adrian Ottiker
 * date:         21.12.2011
 */
// TODO limit memory usage
var fileCache = {};
this.read = function(file, encoding, callback) {
    
    file =  CONFIG.root + file;
    
    if (fileCache[file]) {
        
        callback(null, fileCache[file]);
    }
    else {
        
        fs.readFile(file, encoding, function(err, data) {
        
            if (err) {
                
                callback(err);
            }
            else {
                
                fileCache[file] = data;
                
                fs.unwatchFile(file);
                fs.watchFile(file, function(curr, prev) {
                    
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
    }
};