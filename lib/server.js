"use strict";

var fs = require('fs');
var http = require('spdy');
var express = require('express');
var sessions = require('client-sessions');
var WebSocketServer = require('ws').Server;
var FlowServer = require('./flow.server');
var demux = require('./websocket').demux;
var isJSFile = /\.js$/;

module.exports = function (config) {

    var Flow = FlowServer(config);
    var app = express();
    var server = http.createServer(config.ssl, app);
    var clientSession = sessions(config.session);
    var clientFile = fs.readFileSync(config.paths.modules + '/engine/bundle.js');
    var wss = new WebSocketServer({server: server});
    wss.on('connection', function connection(socket) {

        // plug client session midleware
        clientSession(socket.upgradeReq, {}, function (err) {

            // setup flow on socket
            socket.app = app;

            // multiplexer for flow event streams
            socket.onmessage = demux(Flow, socket.upgradeReq.session);
        });
    });

    // use encrypted client sessions
    app.use(clientSession);

    // load module instance compostion (TODO use JSON-LD)
    app.use('/flow_comp/:name', function (req, res) {

        var name = req.params.name;
        if (!name) {
            res.set({'content-type': 'text/plain'}).status(400);
            res.end(new Error('Flow.server.composition: No module instance compostion name.').stack);
            return;
        }

        // handle entrypoint
        if (name === '*') {
            // TODO get real host name. and find a way to handle multidomain apps
            //      with the infrastructure api
            var host = '';// = socket.upgradeReq.headers.host.split(':')[0];
            var entrypoints = config.entrypoints[req.session.role ? 'private' : 'public'];

            // TODO maybe entrypoints can have simple routing..
            name = entrypoints[host] || entrypoints['*']; 
        }

        Flow.mic(name, function (err, composition) {

            if (err) {
                res.set({'content-type': 'text/plain'}).status(400);
                res.end(err.stack);
                return;
            }

            var module = composition.browser || composition.module;
            if (!module) {
                res.set({'content-type': 'text/plain'}).status(400);
                return res.end(new Error('Flow.server.composition: No module field on instance "' + name  + '".').stack);
            }

            // handle custom modules
            if (
                module[0] === '/' &&
                isJSFile.test(module)
            ) {
                // create client path
                (module = module.split('/')).pop();
                composition.module = module.join('/');
            } 

            res.set({'content-type': 'application/json'}).status(200);
            res.end(JSON.stringify(composition));
        });
    });

    // emit flow events from http urls
    app.use('/flow/:instance::event', function (req, res) {

        var instance = req.params.instance;
        var eventNme = req.params.event;

        if (!instance || !eventNme) {
            res.set({'content-type': 'text/plain'}).status(400);
            res.end(new Error('Instance or event name not found.'));
            return;
        }

        var event = Flow.flow(eventNme, {
            to: instance,
            session: req.session,
            req: req,
            res: res,
        });
        req.pipe(event.i);
        event.o.on('error', function (err) {
            res.status(err.code || 500).send(err.message);
        });
        event.o.pipe(res);

        // push url as first data chunk
        if (req.method === 'GET') {
            req.push(req.url.substr(1));
        }
    });

    // serve client module bundles
    app.get('/module/:module/bundle(.:fp)?.js', function(req, res) {

        // set longer cache age, if file is fingerprinted
        res.set({
            'Cache-Control': 'public, max-age=' + req.params.fp ? config.static.fpMaxAge : config.static.maxAge,
            'Content-Encoding': 'gzip'
        });

        res.sendFile(config.paths.modules + '/' + req.params.module + '/bundle.js');
    });

    // serve client custom module bundles
    app.get('/app_module/:module/bundle(.:fp)?.js', function(req, res) {

        // set longer cache age, if file is fingerprinted
        res.set({
            'Cache-Control': 'public, max-age=' + req.params.fp ? config.static.fpMaxAge : config.static.maxAge,
            'Content-Encoding': 'gzip'
        });

        res.sendFile(config.paths.custom + '/' + req.params.module + '/bundle.js');
    });

    // static file server for public files
    app.use(express.static(config.paths.public, {
        setHeaders: function setCustomCacheControl(res, path) {
            var suffix = path.split('.').pop();
            if (suffix === 'js') {
                res.setHeader('Content-Encoding', 'gzip');
            }
        } 
    }));

    // send the initial document with engine client
    app.use(function (req, res) {

        // push the engine client directly
        // TODO why is res.push all of the sudden undefined???!!!
        if (res.push) {
            res.push('/module/engine/bundle.js', {
                request: {accept: '*/*'},
                    response: {
                    'content-type': 'application/javascript',
                    'Content-Encoding': 'gzip'
                }
            }).end(clientFile);
        }

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
