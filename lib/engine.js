// create the global engine object
var engine = global.engine = {};

// dependencies
var WebSocketServer = require('ws').Server;
var httpServer = require('http');
var Flow = require('./client/flow');

// create flow emitter out of engine
engine = Flow(engine);

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
    'M': true,
    'C': true,
    'E': true,
    'P': true,
    'F': true,
    'W': true,
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
var utils = require('./client/utils');

// data transform handlers
engine.handlers = {
    transform: require('./client/transform')
};

/**
 * Create server module instances
 */
engine.load = function (name, role, callback) {

    // ensure callback
    callback = callback || function () {};

    if (!name) {
        return callback(new Error('No composition name.'));
    }

    // check instance chache
    if (engine.instances[name]) {

        if (!utils.roleAccess(engine.instances[name], role)) {
            return callback(new Error('Access denied for instance:' + name));
        }

        return callback(null, engine.instances[name]);
    }

    // tell cache to remove instance on composition change
    var related = {instances: {}};
    related.instances[name] = true;

    // get composition
    Composition(name, related, role, function (err, composition) {

        if (err) {
            return callback(err);
        }

        if (!composition._main) {
            return callback(new Error('Module "' + composition.module + '" has no "main" config in the package.json.'));
        }

        // require module and create instance
        Instance(require(composition._main), composition, role, callback);
    });
};

/**
 * Start the HTTP and WebSocket servers.
 *
 * @public
 * @param {string} The absolute path to the repo.
 * @param {number} The port number.
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

    // extend engine with logging methods
    engine.log = engine.production ? function () {} : require('./client/logs');

    // save engine in instances cache under the operation id
    engine.instances[engine.operation_id] = engine;

    // create a http server and listen to requests, with the session request handler
    engine.http.server = httpServer.createServer(Session);

    // create a websocket server
    engine.socket = new WebSocketServer({server: engine.http.server});

    // start http server
    engine.http.server.listen(port, function () {

        // core http resouce event interface
        engine.mind('E', {call: Static.client})
              .mind('P', {call: Static.public})
              .mind('F', {call: Static.file})
              .mind('W', {call: Static.wrap})
              // TODO load html snippted over websocket,
              //      until html imports are supported
              .mind('M', {call: Static.markup})
              .mind('C', {call: Static.composition});

        // listen to websocket connections with the session connection handler
        engine.socket.on('connection', Session);
    });
};
