// dependencies
var WebSocketServer = require('ws').Server;
var httpServer = require('http');
var Flow = require('./client/flow');
var utils = require('./client/utils');

// create the global engine object
var engine = global.engine = Flow();

// static values
engine.operation_id = '@';
engine.public_file_id = '!';
engine.public_session = '*';
engine.session_role = 'role';
engine.session_locale = 'locale';
engine.session_user = 'user';
engine.http = {
    'maxAge': 86400,
    'maxAge_fingerprint': 94670000
};

// set network access
engine._access = {
    'html': true,
    'load': true,
    'client': true,
    'public': true,
    'file': true,
    'extFile': true,
};

// set public role
engine._roles = {
    '*': true
};

// engine global dependend dependencies
var Session = require('./session');
var Instance = require('./instance');
var Static = require('./static');

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
        
        // core http resouce event interface
        engine.mind('client', {call: Static.client})
          .mind('public', {call: Static.public})
          .mind('file', {call: Static.moduleFile})
          .mind('extFile', {call: Static.externalFile})
        
        // load html snippted over websocket until html imports are supported
          .mind('html', {call: Static.markup})
        
        // core websocket module instance load interface
          .mind('load', {call: Instance.load});
        
        // listen to websocket connections with the session connection handler
        engine.socket.on('connection', Session);
      
    });

    // save engine in instances cache under the operation id
    engine.instances.set(engine.operation_id, engine);
};
