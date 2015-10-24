var path = require('path');
var http = require('http');
var crypto = require('crypto');
var express = require('express');
var sessions = require('client-sessions');
var WebSocketServer = require('ws').Server;

var Flow = require('../flow/flow');
var httpFlow = require('./request');

// TODO implement http2 when https://letsencrypt.org/ is available
// var http = require('http2');
/*var options = {
    key: fs.readFileSync('./example/localhost.key'),
    cert: fs.readFileSync('./example/localhost.crt')
};*/

var app = express();
var server = http.createServer(/*options, */app);
var wss = new WebSocketServer({server: server});

// TODO use a configuration file or cli args
var sessionDefaults = {
    cookieName: 'SES', // cookie name dictates the key name added to the request object
    requestKey: 'session', // requestKey overrides cookieName for the key name added to the request object
    secret: crypto.randomBytes(64).toString('hex'), // should be a large unguessable string
    duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
    activeDuration: 1000 * 60 * 5, // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
    cookie: {
        ephemeral: false, // when true, cookie expires when the browser closes
        httpOnly: true, // when true, cookie is not accessible from javascript
        secure: false // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
    },

    // engine related configs
    wildcard: '*',
    role: 'role',
    user: 'user',
    locale: 'locale'
};

module.exports = function (repo, port, logLevel, production, token) {

    // normalize repo path
    repo = path.resolve(repo);
    repo = repo + (repo[(repo.length - 1)] === '/' ? '' : '/');

    // TODO extended global with engine constances (Object.freeze)
    global.pkg = require(repo + 'package');
    global.pkg.repository = global.pkg.repository || {};
    global.pkg.repository.local = repo;
    global.pkg.logLevel = logLevel;
    global.pkg.production = production;
    global.pkg.port = port;

    // merge session configs
    if (global.pkg.session) {
        sessionDefaults = Object.assign(sessionDefaults, global.pkg.session);
        sessionDefaults.secret = token || sessionDefaults.secret;
    }

    var clientSession = sessions(sessionDefaults);

    // use encrypted client sessions
    app.use(clientSession);

    // emit flow events from http urls
    app.use('/:instance::event', httpFlow);

    // serve client module bundles
    app.get('/:module/client(.:fp)?.js', function(req, res) {

        if (req.params.fp) {
            // TODO set custom caching headers if fingerprint is in url
        }

        res.sendFile(repo + 'node_modules/' + req.params.module + '/M.js');
    });

    // TODO get public paths from app package
    app.use(express.static('public'));

    // send the initial document with engine client
    app.use(function (req, res) {
        res.sendFile(repo + 'node_modules/engine/lib/module/index.html');
    });

    // handle websocket connections
    wss.on('connection', function connection(socket) {

        // plug client session midleware
        clientSession(socket.upgradeReq, {}, function (err) {

            // setup flow on socket
            socket.app = app;
            Flow.socket(socket);
        });
    });

    // start http server
    server.listen(port, function () {
        console.log('Engine is listening at port', port);
    });
};
