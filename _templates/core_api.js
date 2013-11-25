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
    getAppById: function (appMongoObjectId, callback) {},
    
    /*
        Access: read
        Locations:
            - lib/proxy/spawner.js:103
    */
    getAppFromHost: function (host, returnFields, callback) {},
    
    /*
        Access: read
        Locations:
            - lib/proxy/spawner.js:142
    */
    getAppPid: function (appMongoObjectId, callback) {},
    
    ////////////////////////////////////////////////////////////////////////////
    // ITEM ACCESS CALLS
    ////////////////////////////////////////////////////////////////////////////
    
    /*
        Access: read | miid > module
        Locations:
            - lib/application/operations/module.js:27
    */
    getModuleConfig: function (miid, sessionRoleId, callback) {},
    
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
    getOperationWithPermission: function (miid, method, sesssionRoleId, callback) {}
};

var mono = {
    application: {
        install: function () {},
        uninstall: function () {},
        deploy: function () {},
    },
    module: {},
    git: {}
};
