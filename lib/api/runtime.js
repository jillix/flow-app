M.config.modules = {};

// set config options
exports.setConfig = function (link, key, value) {
    
    if (!link || !link.miid || typeof key === 'undefined') {
        return;
    }
    
    if (typeof key === 'object') {
        return M.config.modules[link.miid] = key;
    }
    
    if (typeof key === 'string' && typeof value !== 'undefined') {
        return M.config.modules[link.miid][key] = value;
    }
}

// get config options
exports.getConfig = function (link, key) {
    
    if (!link || !link.miid) {
        return;
    }
    
    if (typeof key === 'string') {
        return M.config.modules[link.miid][key];
    }
    
    return M.config.modules[link.miid];
}

// TODO
exports.log = {
    
    info: function (tag, msg) {
        
    },
    
    debug: function (tag, msg) {
        
    },
    
    warning: function (tag, msg) {
        
    },
    
    error: function (tag, msg) {
        
    }
}
