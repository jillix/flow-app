// server api
var server = {
    
    ////////////////////////////////////////////////////////////////////////////
    // DIRECT CALLS
    ////////////////////////////////////////////////////////////////////////////
    
    /*
        Access: read
        Locations:
            - lib/application/api.js:43
    */
    getAppById: function (appMongoObjectId, callback) {
        var query = {
            _id: appMongoObjectId
        };
    },
    
    /*
        Access: read
        Locations:
            - lib/proxy/spawner.js:103
    */
    getAppFromHost: function (host, returnFields, callback) {
        var query = {
            'server.host': host
        };
        
        var fields = {
            // return fields, fixed or variable?
        };
    },
    
    /*
        Access: read
        Locations:
            - lib/proxy/spawner.js:142
    */
    // the same as getAppById method, line 13 ?
    getAppPid: function (appMongoObjectId, callback) {},
    
    ////////////////////////////////////////////////////////////////////////////
    // ITEM ACCESS CALLS
    ////////////////////////////////////////////////////////////////////////////
    
    /*
        Access: read | miid > module
        Locations:
            - lib/application/operations/module.js:27
    */
    getMiidConfig: function (miid, sessionRoleId, callback) {
        var query = {
            miid: miid
        };
        
        // check access
        query.roles[sessionRoleId] = {$regex: 'r'};
    },
    
    /*
        Access: read | role > module
        Locations:
            - lib/application/operations/module.js:92
    */
    getModuleFile: function (moduleSonv, sessionRoleId, callback) {},
    
    /*
        Access: read | miid > module operation
        Locations:
            - lib/application/operator.js:26
    */
    getOperationWithPermission: function (miid, method, sesssionRoleId, callback) {},
    
    
    /*
        Locations:
            - lib/proxy/api.js:26
    */
    checkConfig: function () {}
};

var utils = {
    hepl: function () {}
};

var mono = {
    application: {
        install: function (appIds) {},
        uninstall: function (appIds) {},
        
        // to dev or production
        deploy: function (type) {},
        
        // check application (mongo object)
        check: function (application) {}
    },
    module: {
        fetchModules: function () {}
    },
    git: {}
};
