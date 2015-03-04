// dependencies
var EventEmitter = require('events').EventEmitter;
var WebSocketServer = require('ws').Server;
var httpServer = require('http');

// create the global engine object
var engine = global.engine = new EventEmitter();

// static values
engine.operation_id = '@';
engine.public_session = '*';
engine.session_role = 'role';
engine.session_locale = 'locale';
engine.session_user = 'user';
engine.http = {
    maxAge: 86400,
    maxAge_fingerprint: 94670000
};

// set network access
engine._access = {
    html: true,
    load: true
};

// set public role
engine._roles = {
    '*': true
}

/**
 * Start the HTTP and WebSocket servers.
 *
 * @public
 * @param {string} The absolute path to the repo.
 * @param {number} The port number.
 * @param {string} The user id.
 * @param {string} The API key.
 * @param {boolean} Indicates if engine should run in production mode.
 */
module.exports = function start (repo, port, user, key, production) {

    // save starting parameters
    engine.repo = repo + (repo[(repo.length - 1)] === '/' ? '' : '/');
    engine.port = port;
    engine.user = user;
    engine.key = key;
    engine.production = production;

    // static paths values
    engine.root = require('path').normalize(__dirname + '/../');
    engine.paths = {
        app_public: engine.repo + 'public/',
        app_markup: engine.repo + 'markup/',
        app_composition: engine.repo + 'composition/'
    };

    // require utility methods
    require('./client/utils');

    // extend with po0jo cache
    engine.pojo = require('./pojo');

    // extend with file cache
    engine.file = require('./file');

    // require dependencies
    engine.session = require('./session');

    // http request handler
    engine.http.request = require('./request');

    // socket message handler
    require('./client/link');

    // event flow
    require('./client/flow');

    // module factory
    engine.module = require('./module');

    // static files
    engine.static = require('./static');

    // load module files (http)
    engine.on('file', engine.static.moduleFile);

    // listen to the core load module instance configuration event (ws)
    engine.on('load', engine.module.load);

    // create a http server and listen to requests, with the session request handler
    engine.http.server = httpServer.createServer(engine.session);

    // create a websocket server
    engine.socket = new WebSocketServer({server: engine.http.server});

    // listen to websocket connections with the session connection handler
    engine.socket.on('connection', engine.session);

    // start http server
    engine.http.server.listen(port);

    // save engine in instances cache under the operation id
    engine.instances.set(engine.operation_id, engine);
};
