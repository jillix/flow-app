"use strict";

//var http = require('http');
var websocket = require('websocket-stream');
var http = require('flowhttp');
var Stream = require('stream');
var sockets = {};
var events = {};

exports.demux = Demux;
function Demux (CoreInst, socket) {

    /*
      header:
      - instance name
      - event name
      - request id
      - code 0 (data), 1 (error), // 2 (end) ??, read
      body:
      - data
    */

    var demux = Stream.Transform({
        transform: function (chunk, enc, next) {

            // parse chunk
            try {
                chunk = JSON.parse(chunk.toString());
            } catch (err) {
                return next(err);
            }                   

            let instance = chunk[0];
            let eventNme = chunk[1];
            let streamId = instance + eventNme + chunk[2];
            let type = chunk[3];
            let data = chunk[4];

            if (
                chunk.length < 4 ||
                typeof instance !== 'string' || !instance ||
                typeof eventNme !== 'string' || !eventNme ||
                typeof streamId !== 'string' || !streamId ||
                typeof type !== 'number' || type < 0 || type > 2
            ) {
                let err = new Error('Socket.mux: Invalid frame.');
                return next(err);
            }

            // emit or get stream
            socket._streams = socket._streams || {};
            let event = socket._streams[streamId]; 
            if (!event) {
                let options = {
                    to: instance,
                    emit: eventNme,
                    id: chunk[2]
                };
                event = socket._streams[streamId] = CoreInst.flow(eventNme, options);

                event.on('error', function (err) {
                    // TODO send error frame
                    console.log('DEMUX EVENT ERROR:', err);
                });

                // TODO pipe to mux
                event.pipe(Mux(socket, options));
            }

            // write chunk to stream
            // TODO event needs to write to the next correct section!
            event.write(data);

            // message type end
            // message type error
            // message type data

            next();
        }
    });

    return demux;
}

function Mux (socket, options) {

    var mux = Stream.Writable({
        objectMode: true,
        write: function (chunk, enc, next) {
            // create message
            // send message to socket

            let msg = [options.to, options.emit, options.id, 0, chunk];
            socket.write(JSON.stringify(msg));
            next();
        },
        read: function () {
            
        }
    });

    return mux;
}

exports.request = function (CoreInst, options) {

    var request;
    switch (options.net) {

        case '>':
        case 'ws':

            let host = options.host || window.location.host;
            let socket = sockets[host];
            if (!socket) {
                socket = websocket('wss://' + host);
                socket.pipe(Demux(CoreInst, socket));
                sockets[host] = socket;

                socket.on('close', function () {
                    for (var stream in socket._streams) {
                        socket._streams[stream].end();
                    }
                });

                socket.on('end', function () {
                    for (var stream in socket._streams) {
                        socket._streams[stream].end();
                    }
                });

                socket.on('error', function (err) {
                    for (var stream in socket._streams) {
                        socket._streams[stream].emit('error', err);
                    }
                });
                
                socket._streams = {};
            }

            options.id = 'truckenId';
            let streamId = options.to + options.emit + options.id;
            // TODO return a duplex stream and save readable to events
            socket._streams[streamId] = options.subStream;
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

            let url = options.emit[0] === '/' || options.emit.indeOf('http') === 0 ? options.emit : '/' + options.to + ':' + options.emit

            // pipe http to flow event stream
            let method = options.method || (options.end ? 'get' : 'post');
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
            break;

        default:
            // TODO error
            return;
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

