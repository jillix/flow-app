var utils = require('./utils');
var sockets = {};
var streams = {};

exports.setup = setupSocket;
exports.stream = setupStream;

/**
 * Setup a stream to write over a socket.
 *
 * @public
 * @param {object} The stream object.
 * @param {string} The destination URL.
 */
function setupStream (stream, url) {
    
    // append parsed url on stream
    if (typeof url === 'string' && !(url = parseUrl(url))) {
        return console.error('Invalid socket url.');
    }
    
    // create stream id
    stream.id = stream.id || utils.uid(3);
    
    // save url data
    stream.url = url;
    
    // create or get a socket
    stream.socket = stream.socket || getSocket(url.host);
    
    // save session on stream
    stream.session = stream.socket.session;
    
    // send data to socket on data
    stream.data(send);
    
    // append custom end handler
    stream._end = end;
    
    // save stream in cache
    streams[stream.id] = stream;
    
    // save stream on socket, to end stream on socket end
    stream.socket.streams[stream.id] = stream;
    
    return stream;
}

/**
 * Get or create a new client Socket.
 *
 * @public
 * @param {string} The target host.
 */
function getSocket (host) {
    
    // get socket from cached connections
    if (sockets[host]) {
        return sockets[host];
    }
    
    // create new websocket connection
    var socket = sockets[host] = new WebSocket('ws://' + host + '/');
    socket._cacheKey = host;
    
    // setup and return socket
    return setupSocket(socket);
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
function parseUrl (url) {
    
    url = url.split('/');
    if (url.length < 2) {
        return;
    }
    
    var urlObject = {};
    if (url.length < 3) {
        urlObject = {
            // TODO server default host??
            host: global.location.host,
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
function send (err, data) {
    
    // create message
    var message = [1, this.url.inst, this.url.emit, this.id, err ? err.toString() : 0];

    // add the data to the message
    if (typeof data !== 'undefined') {
        message[5] = data;
    }

    // encode message (string)
    try {
        message = JSON.stringify(message);
    } catch (err) {
        return console.error(err);
    }

    // buffer writes if socket is not ready yet
    if (this.socket.readyState !== 1) {
        return this.socket._buffer.push(message);
    }

    // send message over socket
    this.socket.send(message);
}

/**
 * Custom end handler.
 *
 * @private
 */
function end () {

    // remove stream from cache
    delete streams[this.id];
    
    // remove stream from socket
    delete this.socket.streams[this.id];
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
        return console.error(error);
    }
    
    // extract data from parsed message
    var type = message[0];
    var instance = message[1];
    var event = message[2];
    var id = message[3];
    var err = message[4];
    var data = message[5];
    
    // check mandatory message values
    if (!event || !instance || !id) {
        
        // send error back
        message[4] = 'Invalid message.';
        message[5] = 0;
        return socket.send(JSON.stringify(message));
    }

    // get the link object
    var stream = streams[id];

    // write data to stream on write message
    if (type) {
        
        // create a new stream and emit to flow handlers
        if (!stream) {

            // get module instance
            if (!(instance = engine.instances[instance])) {
                
                // load an instance
                // TODO buffer messages for this instance (pause)
                engine.load(message[1], function (err, instance) {
                    
                    if (err) {
                        // send error back
                        message[4] = err;
                        message[5] = 0;
                        return socket.send(JSON.stringify(message));
                    }
                    
                    // create a new stream and save it in cache and write data
                    createStream(instance, event, id, socket, message[1]).write(err, data);
                });
                return;
                
            // check role and event access on server module instance
            } else if (!(utils.eventAccess(instance, socket.session[engine.session_role], event))) {
                
                // send error back
                message[4] = 'Access denied to instance: ' + message[1];
                message[5] = 0;
                return socket.send(JSON.stringify(message));
            }
            
            // create a new stream and save it in cache and write data
            stream = createStream(instance, event, id, socket, message[1]);
        }
        
        stream.write(err, data);
    
    // end stream on end message
    } else if (stream) {
        stream.end(err, data);
    }
}

function createStream (instance, event, id, socket, instanceName) {
    
    // create stream and save it to cache
    sockets[id] = setupStream(instance.flow(event, {
        id: id,
        socket: socket 
    }), {
        inst: instanceName,
        emit: event
    });
    
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
    
    // remove socket from sockets cache
    delete sockets[socket._cacheKey];
    
    // end all streams on socket
    for (var stream in socket.streams) {
        socket.streams[stream].end();
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
