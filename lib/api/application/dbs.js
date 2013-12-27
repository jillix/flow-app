var mongo = require('mongodb');
var Server = mongo.Server;
var MongoClient = mongo.MongoClient;

var CONNECTION_STRING_RE = new RegExp('^mongodb://([a-zA-Z0-9\\._-]+):(\\d{4,5})/([a-zA-Z0-9\\._-]+)$');


module.exports = function(config, callback) {

    // this app has no databases configured
    var dbConfig = config.databases || {};
    var count = Object.keys(dbConfig).length;
    if (!count) {
        // wait one tick, so that the server can add a listener to the api
        return process.nextTick(function () {
            callback(new Error('No db config found.'));
        });
    }

    // get the db user credentials from config
    var pwd = config.apiKey;
    var user = 'admin';

    // gather all the clients that we have to connect with
    var clients = {};
    for (var name in dbConfig) {
        var valid = dbConfig[name].match(CONNECTION_STRING_RE);
        if (!valid) {
            // wait one tick, so that the server can add a listener to the api
            return process.nextTick(function () {
                callback('Invalid connection string for database "' + name + '": ' + dbConfig.name);
            });
        }

        // host + port
        var clientLink = valid[1] + ':' + valid[2];
        clients[clientLink] = clients[clientLink] || [];
        clients[clientLink].push({
            db: valid[3],
            name: name
        });
    }

    var openClients = {};
    var clientsToOpen = Object.keys(clients).length;

    // open connections to all db servers
    for (var link in clients) {
        (function(link) {

            var splits = link.split(':');

            var mongoclient = new MongoClient(new Server(splits[0], splits[1]), {native_parser: true});

            mongoclient.open(function(err, mongoclient) {

                // if we cannot open a client, we give up
                if (err && clientsToOpen > 0) {
                    clientsToOpen = 0;
                    return callback(err);
                }

                openClients[link] = mongoclient;

                if (!--clientsToOpen) {
                    // we are ready, let us build the db cache
                    buildDbCache(user, pwd, clients, openClients, callback);
                }
            });
        })(link);
    }
};

function buildDbCache (user, password, clients, openClients, callback) {

    var dbs = {};

    // gather all the databases that we have to return
    for (var link in clients) {
        for (var i = 0; i < clients[link].length; ++i) {
            dbs[clients[link][i].name] = openClients[link].db(clients[link][i].db);
        }
    }

    var count = Object.keys(dbs).length;

    // now try to authenticate to all the required databases
    for (var name in dbs) {
        (function(name) {

            dbs[name].authenticate(user, password, function(err, data) {

                // one single failure is enough to cancel everything
                if (err && count > 0) {
                    count = 0;
                    return callback(err);
                }

                // everything was OK, we can return the database cache
                if (!--count) {
                    callback(null, dbs);
                }
            });
        })(name);
    }
}

