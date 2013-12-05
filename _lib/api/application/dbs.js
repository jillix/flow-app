var mongo = require('mongodb');
var Server = mongo.Server;
var MongoClient = mongo.MongoClient;

var CON_STR_RE = new RegExp('^mongodb://([a-zA-Z0-9\\._-]+):(\\d{4,5})/([a-zA-Z0-9\\._-]+)$');


module.exports = function(config, callback) {

    // this app has no databases configured
    var dbConfig = config.databases || {};
    var count = Object.keys(dbConfig).length;
    if (!count) {
        return callback(null, dbs);
    }

    var clients = {};
    for (var name in dbConfig) {
        var valid = dbConfig[name].match(CON_STR_RE);
        if (!valid) {
            return callback('Invalid connection string for database "' + name + '": ' + dbConfig.name);
        }
        var clientLink = valid[1] + ':' + valid[2];
        clients[clientLink] = clients[clientLink] || [];
        clients[clientLink].push({
            db: valid[3],
            name: name
        });
    }

    var openClients = {};
    var clientsToOpen = Object.keys(clients).length;

    // open connections to all servers
    for (var link in clients) {
        (function(link) {

            var splits = link.split(':');

            var mongoclient = new MongoClient(new Server(splits[0], splits[1]), {native_parser: true});

            mongoclient.open(function(err, mongoclient) {

                // if we cannot open a client, we give up
                if (err) {
                    clientsToOpen = 0;
                    return callback(err);
                }

                openClients[link] = mongoclient;

                if (!--clientsToOpen) {
                    // we are ready, let us build the db cache
                    return callback(null, buildDbCache(clients, openClients));
                }
            });
        })(link);
    }
}

function buildDbCache (clients, openClients) {

    var dbs = {};

    for (var link in clients) {
        for (var i = 0; i < clients[link].length; ++i) {
            dbs[clients[link][i].name] = openClients[link].db(clients[link][i].db);
        }
    }

    return dbs;
}

