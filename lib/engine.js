// dependencies
var Hub = require('./client/hub');
var utils = require('./client/utils');

// create the global engine object
var engine = global.engine = utils.clone(Hub);
engine._events = {};

// static values
engine.operation_id = '@';
engine.public_file_id = '!';
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
};

var Session = require('./session');
var Instance = require('./instance');
var WebSocketServer = require('ws').Server;
var httpServer = require('http');

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
module.exports = function start (repo, port, production) {

    // save starting parameters
    engine.repo = repo + (repo[(repo.length - 1)] === '/' ? '' : '/');
    engine.port = port;
    engine.production = production;

    // static paths values
    engine.root = require('path').normalize(__dirname + '/../');
    engine.paths = {
        app_public: engine.repo + 'public/',
        app_markup: engine.repo + 'markup/',
        app_composition: engine.repo + 'composition/'
    };

    // create a http server and listen to requests, with the session request handler
    engine.http.server = httpServer.createServer(Session);

    // create a websocket server
    engine.socket = new WebSocketServer({server: engine.http.server});

    // start http server
    engine.http.server.listen(port, function () {
        
        // load module files (http)
        //engine.on('file', engine.static.moduleFile);
        
        // load module files (http)
        //engine.on('extFile', engine.static.externalFile);
    
        // load html snippets (ws)
        //engine.on('html', engine.static.markup);
    
        // listen to the core load module instance configuration event (ws)
        //engine.on('load', engine.module.load);
        
        // listen to websocket connections with the session connection handler
        engine.socket.on('connection', Session);
      
    });

    // save engine in instances cache under the operation id
    engine.instances.set(engine.operation_id, engine);
};
