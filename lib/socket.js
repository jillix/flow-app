"use strict";

//var http = require('http');
var websocket = require('websocket-stream');
var http = require('flowhttp');
var Stream = require('stream');
var sockets = {};
var events = {};

exports.mux =  Multiplexer;
function Multiplexer () {

    /*
      header:
      - instance name
      - event name
      - request id
      - code 0 (data), 1 (error), // 2 (end) ??, read
      body:
      - data
    */

    var CoreInst = this;
    var multiplexer = Stream.Transform({
        transform: function (chunk, enc, next) {

            // parse chunk
            try {
                chunk = JSON.parse(chunk.toString());
            } catch (err) {
                console.log('CHUNK PARSE ERROR:', err);
            }                   

            let instance = chunk[0];
            let eventNme = chunk[1];
            let streamId = chunk[2];
            let type = chunk[3];
            let data = chunk[4];

            if (
                chunk.length < 4 ||
                typeof instance !== 'string' || !instance ||
                typeof eventNme !== 'string' || !eventNme ||
                typeof streamId !== 'string' || !streamId ||
                typeof type !== 'number' || type < 0 || type > 2
            ) {
                console.log(new Error('Socket.mux: Invalid frame.'));
                //this.push(/* send error frame */);
                return next();
            }

            console.log('FRAME:', chunk);

            // emit or get stream
            events[instance] = events[instance] || {};
            let event = events[instance][event] || (events[instance][event] = CoreInst.flow(eventNme, {to: instance, id: streamId}));

            // write chunk to stream
            event.write(data);

            // message type end
            // message type error
            // message type data

            // send data frame
            event.on('data', function (object) {
                let frame = [event.inst._name, event._name, event._id, object];
                multiplexer.push(JSON.stringify(frame));
            });

            // send error frame
            event.on('error', function (error) {
                let frame = [event.inst._name, event._name, event._id, object];
                multiplexer.push(JSON.stringify(frame));
            });

            next();
        }
    });

    return multiplexer;
};

exports.request = function (options) {

    var request;
    switch (options.net) {
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

        case '>':
        case 'ws':

            let host = options.host || window.location.host;
            let socket = socket[host] || (socket[host] = websocket('wss://' + host));

            //CoreInst.flow();

            // TODO how to pipe multiplexer to socket and return the flow event?
            return sockets[host].pipe(Multiplexer()).pipe(sockets[host]);
            
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

