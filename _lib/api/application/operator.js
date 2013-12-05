function getWithPermission (miid, method, roleId, callback) {
    var self = this;
    
    var query = {
        roles: parseInt(roleId, 10),
        application: self.config.id,
        miid: miid,
        'operations.method': method
    };

    var fields = {
        _id: 0,
        file: 1,
        'operations.$.params': 1,
        source: 1,
        owner: 1,
        name: 1,
        version: 1
    };
    
    self.db.miids.findOne(query, {fields: fields}, function (err, operation) {
        
        if (err) {
            return callback(self.error(self.error.DB_MONGO_QUERY_ERROR, 'getWithPermission', err.toString()));
        }

        if (!operation) { 
            return callback(self.error(self.error.API_OPR_NOT_FOUND_PERMISSION, method, miid, roleId));
        }

        if (!operation.file) {
            return callback(self.error(self.error.DB_ORIENT_OPERATION_NOT_COMPLETE, method, miid, roleId));
        }

        operation = {
            file: operation.file,
            params: operation.operations[0].params,
            source: operation.source,
            owner: operation.owner,
            name: operation.name,
            version: operation.version
        };
        
        callback(null, operation);
    });
}

exports.operation = function(link) {
    var self = this;
    
    // XHR is never cached by default, except in IE, but for this we use this
    link.res.headers["cache-control"] = "no-cache";
    console.log(link.operation);
    // handle core operations
    if (link.operation.miid === self.config.coreMiid) {
        checkAndCallFunction.call(self, link, self.module[link.operation.method]);
        return;
    }
    
    // if no operation was found in the request URL
    if (!link.operation.miid || !link.operation.method) {
        return link.send(400, "Missing module instance ID or operation name");
    }

    getWithPermission.call(self, link.operation.miid, link.operation.method, link.session._rid, function(err, operation) {

        if (err) {
            if (typeof err.code === 'string' && err.code.substr(0, 4) === 'API_') {
                return link.send(404, err.message);
            }
            
            return link.send(500, 'Internal server error');
        }
        
        if (operation.version === self.config.MODULE_DEV_TAG) {
            operation.version += '_' + self.config.app;
        }

        var modulePath = operation.source + "/" + operation.owner + "/" + operation.name + "/" + operation.version;
        var file = self.config.paths.APPLICATION_ROOT + self.config.app + "/mono_modules/" + modulePath + "/" + operation.file;
        var method = self.util.load(file, link.operation.method);

        checkAndCallFunction.call(self, link, method, operation.params);
    });
};

function checkAndCallFunction(link, method, params) {
    var self = this;
    
    if (method instanceof Error) {
        return link.send(500, method);
    }

    if (typeof method !== "function") {
        return link.send(404, "Method must be a function");
    }

    if (params) {
        link.params = params;
    }

    else {
        method(self, link);
        link.req.resume();
    }
}
