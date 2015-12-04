"use strict";

var Stream = require('stream');
var sockets = {};

exports.reset = function () {

    // close all websockets
    for (var socket in sockets) {
        sockets[socket].close();
    }

    // remove socket refs
    sockets = {};
};

exports.mux = mux;
function mux (instance, options) {

    options.id = options.id || UID(5);
    var stream = Stream.Transform({
        objectMode: true,
        transform: function (chunk, enc, next) {

            // get socket
            if (!stream.socket) {
                stream.socket = getSocket(instance, options.host);

                // cache mux stream
                stream.socket._streams[options.id] = stream;
            }

            // send message to socket
            sendFrame(stream.socket, options, 0, chunk);

            next();
        }
    });

    stream.socket = options.socket;

    // push response to readable 
    stream.on('frame', function (frame) {

        // remove stream ref if stream end
        if (frame.type > 0) {
            delete socket._streams[frame.id];
        }

        // handle message types
        switch (frame.type) {
            // write data
            case 0:
                stream.push(frame.chunk);
                break;
            // end event
            case 1:
                stream.end(frame.chunk);
                break;
            // emit error
            case 2:
                stream.emit('error', frame.chunk);
                stream.end();
                break;
            // invalid
            default:
                var err = new Error('Websocket.demux: Invalid message type "' + type + '"');
                socket.send(createFrame(err.stack));
        }
    });

    stream.on('finish', function () {

        if (!stream.socket || !stream.socket._streams[options.id]) {
            return; 
        }

        sendFrame(stream.socket, options, 1);
    });

    return stream;
}

exports.demux = demux;
function demux (instance) {

    return function (frame) {

        var socket = frame.target;
        frame = parseFrame(frame.data);
        frame.socket = socket;

        // send error back
        if (frame.err) {
            socket.send(createFrame(frame.err.stack));
        }

        // emit or get stream
        socket._streams = socket._streams || {};
        var stream = socket._streams[frame.id];
        if (!stream) {
   
            stream = instance.flow(frame.emit, Object.assign({}, frame));
            stream.on('error', function (err) {
                socket.send(createFrame(err.stack));
            });

            stream.pipe(mux(instance, frame)).pipe(stream);
            stream.write(frame.chunk);
            return;
        }

        stream.emit('frame', frame);
    };
}

function getSocket (instance, host) {

    // check client host
    host = host || (window ? window.location.host : undefined);
    if (!host) {
        return new Error('Websocket.getSocket: No host.');
    }

    // get socket
    var socket = sockets[host];
    if (!socket) {
        socket = new WebSocket('wss://' + host);
        sockets[host] = socket;
        socket.onopen = function () {
            if (socket._frameBuf.length) {
                socket._frameBuf.forEach(socket.send.bind(socket));
                socket._frameBuf = [];
            }
        };
        socket.onclose = socketEnd;
        socket.onend = socketEnd;
        socket.onerror = function (err) {
            for (var stream in socket._streams) {
                socket._streams[stream].emit('error', err);
            }
        };
        socket.onmessage = demux(instance);
        socket._streams = {};
    }

    socket._frameBuf = socket._frameBuf || [];
    return socket;
}

function sendFrame (socket, frame, type, data) {
    frame.type = type;
    data = type === 1 ? null : data;
    frame = createFrame(data, frame);

    if (socket.readyState !== 1) {
        socket._frameBuf.push(frame);
    } else {
        socket.send(frame);
    }
}

function parseFrame (chunk) {

    try {
        chunk = JSON.parse(chunk.toString());
    } catch (err) {
        return {err: err};
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
        chunk = {err: new Error('Socket.mux: Invalid frame.')};
    }

    return {
        to: instance,
        emit: eventNme,
        id: streamId,
        type: type,
        chunk: data
    };
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

function socketEnd () {
    var socket = this;
    for (var stream in socket._streams) {
        socket._streams[stream].end();
    }
    socket._streams = {};
}

function UID (len) {
    len = len || 23;
    for (var i = 0, random = ''; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return random;
};

