"use strict";

var fs = require('fs');
var http = require('spdy');
var express = require('express');
var sessions = require('client-sessions');
var WebSocketServer = require('ws').Server;
var adapter = require('./flow.server');

module.exports = function (config) {

    var CoreInst = adapter(config);
    var app = express();
    var server = http.createServer(config.ssl, app);
    var clientSession = sessions(config.session);
    var clientFile = fs.readFileSync(config.paths.modules + '/engine/M.js');
    var wss = new WebSocketServer({server: server});
    wss.on('connection', function connection(socket) {

        // plug client session midleware
        clientSession(socket.upgradeReq, {}, function (err) {

            // setup flow on socket
            socket.app = app;

            // multiplexer for flow event streams
            socket.onmessage = CoreInst.demux(CoreInst);
        });
    });

    // use encrypted client sessions
    app.use(clientSession);

    // emit flow events from http urls
    app.use('/:instance::event', function (req, res) {

        var instance = req.params.instance;
        var eventNme = req.params.event;

        if (!instance || !eventNme) {
            res.set({'content-type': 'text/plain'}).status(400);
            res.end(new Error('Instance or event name not found.'));
            return;
        }

        var event = CoreInst.flow(eventNme, {
            to: instance,
            session: req.session,
            req: req,
            res: res,
        });
        req.pipe(event).pipe(res);

        // push url as first data chunk
        if (req.method === 'GET') {
            req.push(req.url.substr(1));
        }
    });

    // serve client module bundles
    app.get('/:module/client(.:fp)?.js', function(req, res) {

        // set longer cache age, if file is fingerprinted
        res.set({
            'Cache-Control': 'public, max-age=' + req.params.fp ? config.static.fpMaxAge : config.static.maxAge,
            'Content-Encoding': 'gzip'
        });

        res.sendFile(config.paths.modules + '/' + req.params.module + '/M.js');
    });

    // static file server for public files
    app.use(express.static(config.paths.public));

    // send the initial document with engine client
    app.use(function (req, res) {

        // push the engine client directly
        res.push('/engine/client.js', {
            request: {accept: '*/*'},
            response: {
                'content-type': 'application/javascript',
                'Content-Encoding': 'gzip'
            }
        }).end(clientFile);

        // send the document
        res.set({
            'Cache-Control': 'public, max-age=' + config.static.maxAge
            //'Content-Encoding': 'gzip'
        });

        res.sendFile(config.paths.modules + '/engine/lib/document.html');
    });

    // start http server
    server.listen(config.port, function () {
        console.log('Engine is listening on port', config.port);
    });
};
