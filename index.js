// read repo path
var repo = process.argv[2];
if (!repo) {
    throw new Error('No repo path.');
}

// get port
var port = process.argv[3];
if (!port || !port.replace(/[^0-9]/g, '')) {
    throw new Error('Not port.');
}

// production mode
if (process.argv[4] === 'PRO') {
    process.env.Z_PRODUCTION = 'true';
}

// access info
process.env.Z_USER = process.argv[5] || '';
process.env.Z_KEY = process.argv[6]  || '';

// system roles
process.env.Z_ROLE_MODULE = '_module';

// session values
process.env.Z_SESSION_PUBLIC = '*';
process.env.Z_SESSION_ROLE_KEY = 'role';
process.env.Z_SESSION_LOCALE_KEY = 'locale';
process.env.Z_SESSION_USER_KEY = 'user';

// engine values
process.env.Z_OP_KEY = '@';

// module role
process.env.Z_ROLE_MODULE = 'module';

// send events
process.env.Z_SEND_INST_REQ = 'I>';
process.env.Z_SEND_QUERY_REQ = 'Q>';
process.env.Z_SEND_MODULE_REQ = 'M';
process.env.Z_SEND_CLIENT_REQ = 'Z';

// http caching
process.env.Z_HTTP_CACHE_MAX_AGE = 86400;
process.env.Z_HTTP_CACHE_MAX_AGE_FINGERPRINT = 94670000;

// path values
process.env.Z_PATH_ENGINE = require('path').normalize(__dirname + '/');
process.env.Z_PATH_PROCESS_REPO = repo;
process.env.Z_PATH_PROCESS_PUBLIC = repo + 'public/';
process.env.Z_PATH_PROCESS_MARKUP = repo + 'markup/';
process.env.Z_PATH_PROCESS_MODULES = repo + 'modules/';
process.env.Z_PATH_PROCESS_COMPOSITION = repo + 'composition/';

var http = require('http');
var WebSocketServer = require('ws').Server;
var engine = require('./lib/engine');

// create a http server
engine.httpServer = http.createServer(engine.session(engine.requestHandler));

// create a websocket server
engine.webSocketServer = new WebSocketServer({server: engine.httpServer});

// listen to websocket connections
engine.webSocketServer.on('connection', engine.session(engine.connectionHandler));

// start http server
engine.httpServer.listen(port);
