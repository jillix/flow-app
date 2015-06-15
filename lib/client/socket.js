var utils = require('./utils');
var sockets = {};
var streams = {};

exports.setup = setupSocket;

exports.stream = function (stream, url) {
    
    // append parsed url on stream
    if (!(url = parseUrl(url))) {
        return console.error('Invalid socket url.');
    }
    
    // create stream id
    stream.id = utils.uid(3);
    
    // save url data
    stream.url = url;
    
    // create or get a socket
    stream.socket = getSocket(url.host);
    
    // send data to socket on data
    stream.data(send);
    
    // append custom end handler
    stream._end = end;
    
    // save stream in cache
    streams[stream.id] = stream;
    
    // save stream on socket, to end stream on socket end
    stream.socket.streams[stream.id] = stream;
    
    return stream;
};

// get or create a socket
function getSocket (host) {
    
    // get socket from cached connections
    if (sockets[host]) {
        return sockets[host];
    }
    
    // create new websocket connection
    var socket = sockets[host] = new WebSocket('ws://' + host + '/');
    
    // setup and return socket
    return setupSocket(socket);
}

function setupSocket (socket) {
  
    // setup socket handlers
    socket.onclose = closeHandler;
    socket.onerror = errorHandler;
    socket.onmessage = parseMessage;
    socket.onopen = openHandler;
    
    // stream refs
    socket.streams = {};
    
    return socket;
}

function parseUrl (url) {
    
    // example url: ws://domain.com/@/load
    
    return {
        host: window.location.host,
        inst: '@',
        emit: 'load'
    };
}

/**
 * Create and send a websocket message.send
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

    // TODO buffer writes if socket is not ready yet

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

    // get module instance
    instance = engine.instances[instance];
    
    // sever specific
    if (!engine.client) {
      
        if (!instance) {
            // TODO try to load the instance
        }
        
        // check role and event access on server module instance
        if (!(utils.eventAccess(instance, socket.session[engine.session_role], event))) {
            return;
        }
    }

    // get the link object
    var stream = streams[id];

    // write data to stream on write message
    if (type) {
        
        // create a new stream and emit to flow handlers
        if (!stream) {
          
            // create a new stream and save it in cache with message id
            stream = streams[id] = instance.flow(event, {
                id: id,
                socket: socket,
                url: {
                    inst: message[1],
                    emit: event
                },
                _end: end,
                _write: send
            });
        }
        
        stream.write(err, data);
    
    // end stream on end message
    } else {
        stream.end(err, data);
    }
}

function openHandler () {
    // TODO get socket ("this" is pobably not the socket)
    // TODO send buffered writes to socket
}

function closeHandler (closeEvent) {
    // TODO get socket ("this" is pobably not the socket)
    
    var socket;
    
    // handle close scenarios
    switch (closeEvent.code) {
      
        // engine reload
        case 3000:
            break;
            
        // socket error
        case 4000:
            break;
        
        // network close
        default:
    }
    
    /*
    // reload imediately, when socket is closed by reload
    if (closeEvent.code === 3000) {
        listen();
        
    // reload imediately without loading entrypoint
    // when an error occured
    } else if (closeEvent.code === 4000) {
        listen(true);

    // every other case, engine tries to reload after ca. 3 seconds
    } else if (!socketReconnectTimeoutId) {
        socketReconnectTimeoutId = setTimeout(function () {
            listen(true);
        }, 3333);
    }
    */
    
    // end all streams on socket
    for (var stream in socket.streams) {
        socket.streams[stream].end();
    }
}

// write error to socket streams
function errorHandler (error) {
    // TODO get socket ("this" is pobably not the socket)
    
    for (var stream in this.streams) {
        stream.write(error);
    }
} 
