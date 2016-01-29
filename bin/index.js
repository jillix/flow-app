#!/usr/bin/env node

"use strict";

var config = require('./config');
var fs = require('fs');
var path = require('path');
var http = require('spdy');
var WSS = require('ws').Server;
var express = require('express');
var sessions = require('client-sessions');
var Flow = require('../lib/flow.server');
var FlowWs = require('flow-ws');

var isJSFile = /\.js$/;
var app = express();
var server = http.createServer(config.ssl, app);
var wss = new WSS({server: server});
var clientSession = sessions(config.session);

var root = path.resolve(__dirname + '/../');
var indexFile = fs.readFileSync(root + '/lib/document.html');
var clientFile = fs.readFileSync(root + '/bundle.js');

function getEntrypoint (req) {

    var entrypoints = config.entrypoints[req.session.role ? 'private' : 'public'];
    if (!entrypoints) {
        return;
    }

    return entrypoints[req.hostname] || entrypoints['*'];
}

wss.on('connection', function connection(socket) {

    // plug client session midleware
    clientSession(socket.upgradeReq, {}, function (err) {

        // setup flow on socket
        socket.app = app;

        // multiplexer for flow event streams
        socket.onmessage = FlowWs.demux(Flow, socket.upgradeReq.session);
    });
});

// use encrypted client sessions
app.use(clientSession);

// emit flow events from http urls
app.use('/\\)\\)/:instance::event', function (req, res) {

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

// load module instance compostion (TODO use JSON-LD)
app.get('/\\(\\(/:name', function (req, res) {

    var name = req.params.name;
    if (!name) {
        res.set({'content-type': 'text/plain'}).status(400);
        res.end(new Error('Flow.server.composition: No module instance compostion name.').stack);
        return;
    }

    // handle entrypoint
    if (name === '*') {
        name = getEntrypoint(req);
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

// serve client custom module bundles
app.get('/(\\(\\)|\\)\\()/:module/bundle(.:fp)?.js', function(req, res) {

    // set longer cache age, if file is fingerprinted
    res.set({
        'Cache-Control': 'public, max-age=' + req.params.fp ? config.static.fpMaxAge : config.static.maxAge,
        'Content-Encoding': 'gzip'
    });

    //res.sendFile(config.paths.modules + '/' + req.params.module bundle.js');
    res.sendFile(config.paths[req.path[1] === '(' ? 'modules' : 'custom'] + '/' + req.params.module + '/bundle.js');
});

// emit url to flow
app.use(function (req, res) {
    
    var instance = getEntrypoint(req);
    if (!instance) {
        res.set({'content-type': 'text/plain'}).status(400);
        return res.end(new Error('Flow.server: No entrypoint found for "' + req.hostname  + '".').stack);
    }

    console.log(instance, req.hostname);
    // ..return client? dynamic index html?
    // ..static file server?

    var stream = Flow.flow('http_req', {to: instance, req: req, res: res});
    stream.o.pipe(res);
    req.pipe(stream.i);
    stream.o.on('error', function (err) {
        res.status(err.code || 500).send(err.stack);
    });
});

// start http server
server.listen(config.port, function () {
    console.log('Engine is listening on port', config.port);
});

// static file server for public files
/*app.use(express.static(config.paths.public, {
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
            request: {accept: '*'+'/'+'*'},
                response: {
                'Content-Type': 'application/javascript',
                'Content-Encoding': 'gzip'
            }
        }).end(clientFile);
    }

    // send the document
    res.set({
        'Cache-Control': 'public, max-age=' + config.static.maxAge,
        'Content-Type': 'text/html'
        //'Content-Encoding': 'gzip'
    });

    res.send(indexFile);
});*/
