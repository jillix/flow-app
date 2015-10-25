// var http = require('http2');
var http = require('http');
var express = require('express');
var sessions = require('client-sessions');
var WebSocketServer = require('ws').Server;
var Flow = require('./flow/flow');

// require and init core module
Flow(require('./core_server'));

module.exports = function (config) {

    var app = express();
    var server = http.createServer(/*config.ssl, */app);
    var wss = new WebSocketServer({server: server});
    var clientSession = sessions(config.session);

    // use encrypted client sessions
    app.use(clientSession);

    // emit flow events from http urls
    app.use('/:instance::event', function (req, res, next) {

        var stream = Flow.emit(req.params.instance + '/' + req.params.event, {req: req, res: res});

        // setup stream
        //stream.end = res.end;
        //stream.data(res.send);
        //stream.error(function (err, status) {res.status(status); res.send(err)});

        req.on('data', function (chunk) {
            stream.write(null, chunk);
        });
        req.on('error', function (chunk) {
            stream.write(chunk);
        });

        res.end('Flow emit: ' + req.params.instance + '/' + req.params.event);
    });

    // serve client module bundles
    app.get('/:module/client(.:fp)?.js', function(req, res) {

        // set longer cache age, if file is fingerprinted
        res.set(
            'Cache-Control',
            'public, max-age=' + req.params.fp ? config.static.fpMaxAge : config.static.maxAge
        );

        res.sendFile(config.paths.modules + '/' + req.params.module + '/M.js');
    });

    // static file server for public files
    app.use(express.static(config.paths.public));

    // send the initial document with engine client
    app.use(function (req, res) {
        res.set('Cache-Control', 'public, max-age=' + config.static.maxAge);
        res.sendFile(config.paths.modules + '/engine/lib/document.html');
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
    server.listen(config.port, function () {
        console.log('Engine is listening on port', config.port);
    });
};
