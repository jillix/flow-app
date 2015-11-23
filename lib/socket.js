"use strict";

var http = require('flowhttp');
var Stream = require('stream');
var sockets = {};

exports.demux = Demux;
function Demux (CoreInst) {

    return function (chunk) {

        var socket = chunk.target;
        chunk = chunk.data;

        // parse chunk
        try {
            chunk = JSON.parse(chunk.toString());
        } catch (err) {
            return socket.send(createFrame(err.stack));
        }                   

        var instance = chunk[0];
        var eventNme = chunk[1];
        var streamId = chunk[2];
        var type = chunk[3];
        var data = chunk[4];

        if (
            chunk.length < 4 ||
            typeof instance !== 'string' || !instance ||
            typeof eventNme !== 'string' || !eventNme ||
            typeof streamId !== 'string' || !streamId ||
            typeof type !== 'number' || type < 0 || type > 2
        ) {
            socket.send(createFrame((new  Error('Socket.mux: Invalid frame.')).stack));
            return;
        }

        // emit or get stream
        socket._streams = socket._streams || {};
        var event = socket._streams[streamId];
        if (!event) {
            var options = {
                to: instance,
                emit: eventNme,
                id: streamId
            };
   
            event = socket._streams[streamId] = CoreInst.flow(eventNme, options);
            options._nextSeq = event;

            var mux = Mux(socket, options);
            event.pipe(mux);
            event.on('error', mux.emit.bind(mux, 'error'));
        }

        // handle message types
        switch (type) {
            // write data
            case 0:
                event.write(data);
                break;
            // end event
            case 1:
                event.end(data);
                break;
            // emit error
            case 2:
                event.emit.bind(event, 'error', data);
                event.end();
                break;
            // invalid
            default:
                event.emit.bind(event, 'error', new Error('Socket.demux: Invalid message type "' + type + '"'));
        }
    };
}

function Mux (socket, options) {

    socket._msgBuf = socket._msgBuf || [];
   
    var frameConfig = {
        id: options.id || UID(5),
        to: options.to,
        emit: options.emit
    };
    var mux = Stream.Writable({
        objectMode: true,
        write: function (chunk, enc, next) {

            frameConfig.type = 0;
            var msg = createFrame(chunk, frameConfig);

            if (socket.readyState !== 1) {
                socket._msgBuf.push(msg);
            } else {
                socket.send(msg);
            }

            next();
        }
    });
    mux.socket = socket;

    mux.on('error', function (err) {
        mux.end();
        frameConfig.type = 2;
        socket.send(createFrame(err.stack, frameConfig));
    });

    mux.on('end', function () {
        delete socket._streams[frameConfig.id];
    });

    socket._streams[frameConfig.id] = options._nextSeq;

    return mux;
}

function createFrame (data, config) {

    config = config || {
        to: '@',
        emit: 'error',
        id: 'err',
        type: '2'
    };

    var frame;
    try {
        frame = JSON.stringify([
            config.to,
            config.emit,
            config.id,
            config.type,
            data
        ]);
    } catch (err) {
        frame = JSON.stringfy(['@', 'error', 'err', 2, err.stack]);
    }
    return frame;
}

/**
 * Retruns a random string.
 *
 * @public
 * @param {number} The length of the random string.
 */
function UID (len) {
    len = len || 23;
    for (var i = 0, random = ''; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return random;
};

function socketEnd () {
    var socket = this;
    for (var stream in socket._streams) {
        socket._streams[stream].end();
    }
    socket._streams = {};
}

exports.request = function (CoreInst, options) {

    var request;
    switch (options.net) {

        case '>':
        case 'ws':

            var host = options.host || window.location.host;
            var socket = sockets[host];
            if (!socket) {

                socket = new WebSocket('wss://' + host);
                sockets[host] = socket;

                socket.onopen = function () {
                    if (socket._msgBuf.length) {
                        socket._msgBuf.forEach(socket.send.bind(socket));
                        socket._msgBuf = [];
                    }
                };
                socket.onclose = socketEnd;
                socket.onend = socketEnd;
                socket.onerror = function (err) {
                    for (var stream in socket._streams) {
                        socket._streams[stream].emit('error', err);
                    }
                };
                socket.onmessage = Demux(CoreInst);
                socket._streams = {};
            }

            request = Mux(socket, options);
            break;

        case '/':
        case 'http':

            /*
            var opts = {
                method: 'GET',
                path: '/' + instance._name + ':' + eventName.substr(1)
                headers: {},
                host: window.location.host,
                port: window.location.port
                responseType: 'response type to set on the underlying xhr object'
            };
            */

            var url = options.emit[0] === '/' || options.emit.indexOf('http') === 0 ? options.emit : '/' + options.to + ':' + options.emit

            // pipe http to flow event stream
            var method = options.method || (options.end ? 'get' : 'post');
            request = http[method](url);

            // collect all data for a classic request callback
            if (options.end) {
                var body = '';
                var error;
                request.on('response', function (res) {
                    if (res.statusCode !== 200) {
                        error = true;
                    }
                })
                request.on('data', function (chunk) {
                    body += chunk;
                })
                .on('error', function (err) {
                    body = err;
                })
                .on('end', function () {
                    if (error) {
                        error = body;
                        body = undefined;
                    }
                    options.end(error, body);
                });
                request.end();
            }
    }

    return request;
}

exports.reset = function () {

    // close all websockets
    for (var socket in sockets) {
        sockets[socket].close();
    }

    // remove socket refs
    sockets = {};
};

