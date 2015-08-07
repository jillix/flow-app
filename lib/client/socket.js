var utils = require('./utils');
var streams = {};
var sockets = {};

exports.setup = setupSocket;
exports.stream = setupStream;

engine._r.push(function () {

    // close all websockets
    for (var socket in sockets) {
        sockets[socket].close();
    }

    // remove stream refs
    streams = {};

    // remove socket refs
    sockets = {};
});

/**
 * Setup a stream to write over a socket.
 *
 * @public
 * @param {object} The stream object.
 * @param {string} The destination URL.
 */
function setupStream (stream, url) {

    // append parsed url on stream
    if (!url || typeof url === 'string' && !(url = parseUrl(url, stream))) {
        engine.log('E', new Error('Invalid socket URL.'));
        return stream;
    }

    // create socket context
    if (!stream.context.socket) {

        // create stream id
        var context = {
            id: utils.uid(3),
            url: url
        };
        context.socket = getSocket(stream, context.id, context.url);
        context.session = context.socket.session;
        stream.context = context;
    }

    // send data to socket on data
    stream.data(send);
    stream.error(send, 1);

    // append custom end handler
    stream._end = end;

    // save stream in cache
    streams[stream.context.id] = stream;

    return stream;
}

/**
 * Get or create a new client Socket.
 *
 * @public
 * @param {string} The target host.
 */
function getSocket (stream, id, url) {

    var host = url.host || global.location.host;
    var socket = sockets[host];

    // get socket from cached connections
    if (socket && socket.readyState < 2) {
        sockets[host].streams[id] = stream;
        return sockets[host];
    }

    // create new websocket connection
    socket = sockets[host] = new WebSocket('ws://' + host + '/');
    socket._cacheKey = host;

    socket = setupSocket(socket);

    socket.streams[id] = stream;

    // setup and return socket
    return socket;
}

/**
 * Setup socket with handlers.
 *
 * @public
 * @param {object} The socket.
 */
function setupSocket (socket) {

    // stream refs
    socket.streams = {};
    socket._buffer = [];

    // session
    socket.session = socket.session || {};

    // setup socket handlers
    socket.onclose = closeHandler;
    socket.onerror = errorHandler;
    socket.onmessage = parseMessage;
    socket.onopen = openHandler;

    return socket;
}

/**
 * Parse a socket URL string.
 *
 * @public
 * @param {string} The destination URL.
 */
function parseUrl (url, stream) {

    url = url.split('/');
    if (url.length < 2) {
        url.unshift(stream._._name);
    }

    var urlObject = {};
    if (url.length < 3) {
        urlObject = {
            inst: url[0],
            emit: url[1]
        };
    } else {
        urlObject = {
            host: url[0],
            inst: url[1],
            emit: url[2]
        };
    }

    return urlObject;
}

/**
 * Create and send a websocket message.
 *
 * @private
 * @param {object} The error object.
 * @param {object} The data object.
 */
function send (data, stream, type) {

    // create message
    var context = stream.context;
    var message = [type || 0, context.url.inst, context.url.emit, context.id];

    // convert error objects to strings
    if (type === 1 && data.toString) {
        data = data.toString();
    }

    // add the data to the message
    if (typeof data !== 'undefined') {
        message[4] = data;
    }

    // encode message (string)
    try {
        message = JSON.stringify(message);
    } catch (err) {
        return engine.log('E', err);
    }

    // create a new socket
    if (!context.socket) {
        context.socket = getSocket(stream, context.id, context.url);
    }

    // buffer writes if socket is not ready yet
    if (context.socket.readyState !== 1) {
        return context.socket._buffer.push(message);
    }

    // send message over socket
    context.socket.send(message);
}

/**
 * Custom end handler.
 *
 * @private
 */
function end (data, fromMessage) {

    // send end signal
    if (!fromMessage) {
        send(data, this, 2);
    }

    // remove stream from cache
    delete streams[this.context.id];

    // remove stream from socket
    delete this.context.socket.streams[this.id];
}

/**
 * Prase websocket messages.
 *
 * @public
 * @param {object} The message event object.
 */
function parseMessage (messageEvent) {

    var socket = messageEvent.target;
    var message = messageEvent.data;
    var role = (socket.session || {})[engine.session_role];

    // parse message
    // protocoll: [type, instance, event, id, err, data]

    // TODO broadcast (grouped connections)
    /*
      - how to define/create groups?
      - get group by name
      - get group by session id
      - get group by regexp pattern?
      - get group by role?
      - check group access with session
      - public groups
    */

    try {
        message = JSON.parse(message);
    } catch (error) {
        return engine.log('E', error);
    }

    // extract data from parsed message
    var type = message[0];
    var instance = message[1];
    var event = message[2];
    var id = message[3];
    var data = type === 1 ? [message[4]] : [null, message[4]];


    // check mandatory message values
    if (!event || !instance || !id) {

        // send error back
        message[0] =  1;
        message[4] = 'Invalid message.';
        return socket.send(JSON.stringify(message));
    }

    // get the link object
    var stream = streams[id];

    // write data to stream on write message
    if (type < 2) {

        // create a new stream and emit to flow handlers
        if (!stream) {

            // get module instance
            if (!(instance = engine.instances[instance])) {

                // load an instance
                engine.load(message[1], role, function (err, instance) {

                    if (err) {

                        // send error back
                        message[0] = 1;
                        message[4] = err;
                        return socket.send(JSON.stringify(message));
                    }

                    // create a new stream and save it in cache and write data
                    stream = createStream(instance, event, id, socket, message[1]);
                    stream.write.apply(stream, data);
                });
                return;

            // check role and event access on server module instance
            } else if (!(utils.eventAccess(instance, role, event))) {

                // send error back
                message[0] = 1;
                message[4] = 'Access denied to instance: ' + message[1];
                return socket.send(JSON.stringify(message));
            }

            // create a new stream and save it in cache and write data
            stream = createStream(instance, event, id, socket);
        }

        stream.write.apply(stream, data);

    // end stream on end message
    } else if (stream) {
        stream.end(data, true);
    }
}

function createStream (instance, event, id, socket) {

    var stream = instance.flow(event, true);
    stream.context = {
        id: id,
        socket: socket,
        url: {
            inst: instance._name || '@',
            emit: event
        }
    };

    // create stream and save it to cache
    sockets[id] = setupStream(stream, stream.context.url);

    return sockets[id];
}

/**
 * Write bufferd data when a socket is connected.
 *
 * @public
 * @param {object} The open event object.
 */
function openHandler (openEvent) {
    var socket = openEvent.target;

    // send buffered writes to socket
    if (socket._buffer.length) {
        for (var i = 0, l = socket._buffer.length; i < l; ++i) {
            socket.send(socket._buffer[i]);
        }

        // empty buffer
        socket._buffer = [];
    }
}

/**
 * Remove socket from cache and end streams.
 *
 * @public
 * @param {object} The close event object.
 */
function closeHandler (closeEvent) {
    var socket = closeEvent.target;

    for (var stream in socket.streams) {

        // end all streams on the server
        if (!engine.client) {
            socket.streams[stream].end();

        // remove socket ref on the stream
        } else {
            delete socket.streams[stream].context.socket;
        }
    }

    // remove socket from sockets cache
    if (sockets[socket._cacheKey] && sockets[socket._cacheKey].readyState > 0) {
      delete sockets[socket._cacheKey];
    }
}

/**
 * Write socket errors to streams.
 *
 * @public
 * @param {object} The error event object.
 */
function errorHandler (errorEvent) {
    var socket = errorEvent.target;
    for (var stream in socket.streams) {
        stream.write(errorEvent.data);
    }
}
