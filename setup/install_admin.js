var fs = require('fs');
var path = require('path');

var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var MongoServer = mongo.Server;
var mongoClient = new MongoClient(new MongoServer('localhost', 27017));

var root = path.normalize(__dirname + '/../');
var appCache = root + '/cache/apps/';
var appName = 'admin';
var repo = 'https://github.com/jillix/admin.git';
var userName = 'admin@jillix.com';
var userPwd = '1234';
var systemDb = 'mono';

// TODO set unique index on mono/m_users.name

// check if application repo exists
if (!fs.existsSync(appCache + appName)) {
    return console.log(
        'No admin app "' + appName + '" found!\n' +
        'Please clone your admin app to mono/cache/apps/.\n' +
        'example: git clone git@github.com:jillix/admin.git'
    );
}

// get the mono database
getDatabases(function (err, dbs) {
    
    if (err) {
        return finish(err);
    }
    
    // mimic process.mono
    process.mono = {
        db: dbs,
        paths: {MONO_ROOT: root}
    };

    // get api
    var API = require(appCache + appName + '/api');
    API(function (err, api) {
        
        // create/get user
        api.user.get(userName, function (err, user) {
            
            if (err) {
                return finish(err);
            }
            
            // reset admin app if admin user exists
            if (user) {
                return api.app.resetDev(user, repo, function (err, appId) {
                    finish(err, appId);
                });
            }
            
            // create new user
            api.user.create(userName, userPwd, function (err, user) {
                
                if (err) {
                    return finish(err);
                }
                
                finish(err, appId);
                
                // clone and install admin app
                api.app.cloneDev(user, repo, function (err, appId) {
                    finish(err, appId);
                });
            });
        });
    });
});

function finish (err, appId) {
    
    mongoClient.close();
    
    if (err) {
        return console.error(err);
    }
    
    console.log('Admin app "' + appId + '" succesfully installed.');
}

function getDatabases (callback) {
    mongoClient.open(function(err, mongoClient) {
        
        if (err) {
            callback(err);
        }
        
        callback(null, {
            mono: mongoClient.db(systemDb)
        });
    });
}

return;

var EventEmitter = require('events').EventEmitter;

var newApp = require('./application.json');

if (!newApp.application || !newApp.application.uid || !newApp.application.domains || !newApp.application.name) {
    return;
}

// TODO install mono dev under admin user, which has access to the mono database
// TODO one apy key per user, not per application to share databases

// TODO this is only temporary, until the database api is implemented
var appId = mongo.ObjectID('52a357298eb3ce0b18000001');

var mongoClient = new MongoClient(new MongoServer('localhost', 27017));
mongoClient.open(function(err, mongoClient) {
    
    // simulate API
    var API = new EventEmitter();
    API.db = {
        mono: mongoClient.db('mono'),
        // TODO this should be created with the database api
        app: mongoClient.db('app_' + appId)
    };
    
    // clear data
    API.db.mono.collection('m_applications').remove({_id: appId}, function () {
        API.db.app.dropDatabase(function () {
        
            // test creating a new app
            create.call(API, newApp.application.name, newApp.application.domains, function (err) {
                mongoClient.close();
            });
        });
    });
});

function insertToDb (db, collection, data, event) {
    var self = this;
    
    if (self.error) {
        return;
    }
    
    // insert public role
    self.db[db].collection(collection).insert(data, function (err) {
        if (err) {
            return self.emit('app.create_error', err);
        }
        
        if (event) {
            self.emit('app.create_' + event);
        }
    });
}

function create (name, domains, callback) {
    var self = this;
    
    // TODO check if domain exists
    
    // collect mongodb ids for rollback
    var rollBack = []; // collection.remove({$in: rollBack});
    
    // copy newApp
    var template = JSON.parse(JSON.stringify(newApp));
    
    // add name to application
    template.application.name = name;
    
    // add domains to application
    template.application.domains = domains;
    
    // get a mongodb id for the application
    template.application._id = appId;
    rollBack.push(template.application._id);
    
    // create public role
    var publicRoleId = mongo.ObjectID();
    rollBack.push(publicRoleId);
    
    if (!template.roles) {
        template.roles = [];
    }
    template.roles.push({
        _id: publicRoleId,
        name: 'public'
    });
    
    // add public role to session config
    template.application.process.session.publicRole = publicRoleId;
    
    // get and set ids for modules
    var modules = {};
    for (var mi = 0, ml = template.modules.length; mi < ml; ++mi) {
        template.modules[mi]._id = modules[template.modules[mi]._id] = mongo.ObjectID();
        rollBack.push(template.modules[mi]._id);
        
        // add public role to modules
        template.modules[mi].roles = [publicRoleId];
    }
    
    // add module and role ids to module instances
    var instances = {};
    for (var ii = 0, il = template.instances.length; ii < il; ++ii) {
        if (modules[template.instances[ii].module]) {
            template.instances[ii].module = modules[template.instances[ii].module];
        } else {
            throw new Error('Module for instance not found: ' + template.instances[ii].module);
        }
        
        // create ids for instances
        template.instances[ii]._id = mongo.ObjectID();
        rollBack.push(template.instances[ii]._id);
        
        // add public role to instances
        template.instances[ii].roles = [publicRoleId];
    }
    
    // convert object id and add public role to views
    for (var vi = 0, vl = template.views.length; vi < vl; ++vi) {
        template.views[vi]._id = mongo.ObjectID(template.views[vi]._id);
        template.views[vi].roles = [publicRoleId];
    }
    
    // convert object id and add public role to models
    for (var dm = 0, dl = template.models.length; dm < dl; ++dm) {
        template.models[dm]._id = mongo.ObjectID(template.models[dm]._id);
        
        if (template.models[dm].schema) {
            template.models[dm].schema = mongo.ObjectID(template.models[dm].schema);
        }
        
        template.models[dm].roles = [publicRoleId];
    }
    
    // convert object id and add public role to schemas
    for (var si = 0, sl = template.schemas.length; si < sl; ++si) {
        template.schemas[si]._id = mongo.ObjectID(template.schemas[si]._id);
        template.schemas[si].roles = [publicRoleId];
    }
    
    // TODO create a user and get uid (API)
    // TODO give app user read rights in lib/application and lib/client
    template.application.uid = 1000;
    template.application.gid = 1000;
    template.application.process.user = 'app_' + template.application._id;
    
    // TODO create apiKey (or set an existing one?) (API)
    template.application.process.apiKey = '1234';
    
    // TODO get mongodb connection string (API)
    // - create mongodb database
    // - create mongodb user
    // - add mongodb user to the created database
    if (!template.application.process.databases) {
        template.application.process.databases = {};
    }
    template.application.process.databases.app = 'mongodb://localhost:27017/' + template.application.process.user;
    
    // create application folder
    // copy instance files in public folder (html, css, js, images, ..)
    // TODO set rights (wait with this step until spawner uses uid/giu)
    
    // TODO template ids (set ids when the templates are known)
    
    // TODO insert data in db
    var eventPrefix = 'app.create_';
    self.on(eventPrefix + 'mongoDbUser', function () {
        insertToDb.call(self, 'app', 'm_roles', template.roles, 'rolesInDb');
    });
    self.on(eventPrefix + 'rolesInDb', function () {
        insertToDb.call(self, 'mono', 'm_applications', template.application, 'applicationInDb');
    });
    self.on(eventPrefix + 'applicationInDb', function () {
        insertToDb.call(self, 'app', 'm_modules', template.modules, 'modulesInDb');
    });
    self.on(eventPrefix + 'modulesInDb', function () {
        insertToDb.call(self, 'app', 'm_instances', template.instances, 'instancesInDb');
    });
    self.on(eventPrefix + 'instancesInDb', function () {
        insertToDb.call(self, 'app', 'm_views', template.views, 'viewsInDb');
    });
    self.on(eventPrefix + 'viewsInDb', function () {
        insertToDb.call(self, 'app', 'm_models', template.models, 'modelsInDb');
    });
    self.on(eventPrefix + 'modelsInDb', function () {
        insertToDb.call(self, 'app', 'm_schemas', template.schemas, 'schemasInDb');
    });
    self.on(eventPrefix + 'schemasInDb', function () {
        
        // all saved
        mongoClient.close();
        callback(null);
    });
    
    self.on('app.create_error', function (err) {
        self.error = true;
        
        // TODO roll back
        console.log(err, rollBack);
        mongoClient.close();
    });
    
    // TODO this has to be done with the API
    // insert mongodb user
    self.db.app.addUser(
        template.application.process.user,
        template.application.process.apiKey,
        {"roles" : ["readWrite"]},
        function (err) {
            if (err) {
                return self.emit(eventPrefix + 'error', err);
            }
            
            self.emit(eventPrefix + 'mongoDbUser');
        }
    );
    
    // TODO install modules (API)
}

exports.create = create;
