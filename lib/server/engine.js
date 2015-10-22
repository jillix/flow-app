var express = require('express');
var http = require('http');
var sessions = require('client-sessions');
var crypto = require('crypto');
var WebSocketServer = require('ws').Server;
var Flow = require('../flow/flow');
var httpFlow = require('./request');
//var moduleFile = require('../module/file');

// TODO implement http2 when https://letsencrypt.org/ is available
/*var options = {
    key: fs.readFileSync('./example/localhost.key'),
    cert: fs.readFileSync('./example/localhost.crt')
};*/

var app = express();
var server = http.createServer(/*options, */app);
var wss = new WebSocketServer({server: server});

// url = require('url')

module.exports = function (repo, port, logLevel, production, token) {

    // TODO extended global with engine constances (Object.freeze)

    // create a secret token if non is given in the cli args
    token = token || crypto.randomBytes(64).toString('hex');

    var clientSession = sessions({
        cookieName: 'SES', // cookie name dictates the key name added to the request object
        requestKey: 'session', // requestKey overrides cookieName for the key name added to the request object
        secret: token, // should be a large unguessable string
        duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
        activeDuration: 1000 * 60 * 5, // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
        cookie: {
            ephemeral: false, // when true, cookie expires when the browser closes
            httpOnly: true, // when true, cookie is not accessible from javascript
            secure: false // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
        }
    });

    // use encrypted client sessions
    app.use(clientSession);

    // emit flow events from http urls
    app.use('/:instance::event', httpFlow);
    app.use('/:module@:version/', function (req, res, next) {

        // TODO check module file access (handle with the require module)
        res.end('Module: ' + req.params.module + '@' + req.params.version);
    });

    // TODO get public paths from app package
    app.use(express.static('public'));

    // handle websocket connections
    wss.on('connection', function connection(socket) {

        // plug client session midleware
        clientSession(socket.upgradeReq, {}, function (err) {

            // setup flow on socket
            socket.app = app;
            Flow.net(socket);
        });
    });

    // start http server
    server.listen(port, function () {
        console.log('Engine is listening at port', port);
    });
}

// TODO create server side core module
/*
var path = require('path');
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
var Composition = require('./composition');
var Instance = require('./client/instance');
var Static = require('./static');

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
};
*/