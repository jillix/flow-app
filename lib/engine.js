var path = require('path');

// create global memory cache
global.MEMCACHE = {};
global.reload = function () {
    global.MEMCACHE = {};
};

// dependencies
var WebSocketServer = require('ws').Server;
var httpServer = require('http');
var Flow = require('./client/flow');

// create the global engine object
var engine = global.engine = Flow();
engine._r = [];
engine.reload = function () {};

// create flow emitter out of engine
//engine = Flow(engine);

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

// set public role
engine._roles = {
    '*': true
};

// engine global dependend dependencies
var Session = require('./session');
var Composition = require('./composition');
var Instance = require('./client/instance');
var Static = require('./static');

/**
 * Start the HTTP and WebSocket servers.
 *
 * @public
 * @param {string} The absolute path to the repo.
 * @param {number} The port number.
 * @param {boolean} Indicates if engine should run in production mode.
 */
module.exports = function (repo, port, logLevel, production) {

    // normalize repo path
    repo = path.resolve(repo);

    // save starting parameters
    engine.repo = repo + (repo[(repo.length - 1)] === '/' ? '' : '/');
    engine.port = port;
    engine.production = production;
    engine.logLevel = logLevel || (production ? 'error' : 'debug');

    // static paths values
    engine.root = require('path').normalize(__dirname + '/../');
    engine.paths = {
        app_public: engine.repo + 'public/',
        app_markup: engine.repo + 'markup/',
        app_composition: engine.repo + 'composition/'
    };

    // extend engine with logging methods
    engine.log = require('./client/logs');

    // get package
    engine.package = require(engine.repo + 'package');
    if (!engine.package || !engine.package.entrypoints) {
        throw new Error('No entrypoints found in package.json');
    }

    // save engine in instances cache under the operation id
    engine.instances[engine.operation_id] = engine;

    // create a http server and listen to requests, with the session request handler
    engine.http.server = httpServer.createServer(Session);

    // create a websocket server
    engine.socket = new WebSocketServer({server: engine.http.server});

    // start http server
    engine.http.server.listen(port, function () {

        // core http resouce event interface
        engine._flow = {

            // TODO load html snippted over websocket, until html imports are supported
            'M': [[Static.markup]],

            'E': [[Static.client]],
            'P': [[Static.public]],
            'F': [[Static.file]],
            'W': [[Static.wrap]],

            // fetch a composition config
            'C': [[Static.composition]],

            'IC': [[Instance.cache]],
            'I': [[
                Composition,
                Instance.build
            ]],
        };

        // listen to websocket connections with the session connection handler
        engine.socket.on('connection', Session);
    });
};
