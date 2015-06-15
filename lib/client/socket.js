var utils = require('./utils');
var sockets = {};
var streams = {};

exports.parse = parseMessage;

exports.setup = function factory (stream, dest) {
    
    // append parsed url on stream
    stream.dest = parseUrl(dest);
    
    // create or get a socket
    stream.socket = engine.client ? getSocket(stream.dest.host) : engine.socket;
    
    // overwrite core stream handlers
    stream._end = end;
    stream._write = send;
    
    return stream;
};

function parseUrl (url) {
    
    // example url: ws://domain.com/@/load
    
    return {
        type: 'ws',
        host: window.location.host,
        inst: '@',
        emit: 'load'
    };
}

/**
 * Create and send a websocket message.send
 *
 * @private
 * @param {number} The message type.
 * @param {object} The error object.
 * @param {object} The data object.
 */
function send (type, err, data, ack) {

    // create message
    var message = [type, this._instance, this._event, this._id, err ? err.toString() : 0];

    // add the data to the message
    if (typeof data !== 'undefined') {
        message[5] = data;
    }

    // encode message (string)
    try {
        message = JSON.stringify(message);

    // return error
    } catch (err) {
        return err;
    }

    // send message
    this.socket.send(message, ack);
    
    // call the acknowledge handler
    if (engine.client && ack) {
        ack();
    }
}

/**
 * Destroy a link
 *
 * @private
 * @param {object} The module instance.
 * @param {object} The link object.
 */
function end (stream, err, data) {

    // call the end handler
    stream._end && stream._end(err, data);
    
    // destroy link
    delete stream._._links[link.id];
}

// get or create a socket
function getSocket (host) {
    
    // get socket from cached connections
    if (sockets[host]) {
        return sockets[host];
    }
    
    // create new websocket connection
    var socket = sockets[host] = new WebSocket('ws://' + host + '/');
    
    // setup socket handlers
    socket.onclose = closeHandler;
    socket.onerror = errorHandler;
    socket.onmessage = parseMessage;
    socket.onopen = openHandler;
    
    return socket;
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
    
    // TODO check mandatory message values
    
    // get module instance
    instance = instance ? engine.instances[instance] : engine;
    
    // check role and event access on server module instance
    if (!engine.client && !(instance = utils.eventAccess(session[engine.session_role], instance, event))) {
        return;
    }

    // get the link object
    var stream = streams[id];

    // create a new stream and emit to flow handlers
    if (!stream) {

        // create a new stream with a custom id
        var context = {
            id: utils.uid(3),
            socket: socket
        };
        
        stream = streams[context.id] = instance.flow(event, stream, context);
    }

    // write data to stream on write message
    if (type) {
        stream.write(err, data);
    
    // end stream on end message
    } else {
        stream.end(err, data);
    }
}
function openHandler () {}
function closeHandler (closeEvent) {
    
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
    
    // ..end streams, which use this socket
}
function errorHandler (error) {
    
    console.error(error);
    
    // end streams
    socket.close(4000);
} 
