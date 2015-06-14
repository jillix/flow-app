
var sockets = {};

exports.send = function () {
    
};

/**
 * Handle websocket messages.
 *
 * @public
 * @param {sring} The message data.
 * @param {object} The websocket.
 * @param {object} The session object.
 */
exports.message = function messageHandler (message, websocket, session) {

    // parse message
    // protocoll: [type, instance, event, id, err, data]
    try {
        message = JSON.parse(message);
    } catch (error) {
        return;
    }
    
    // extract data from parsed message
    var type = message[0];
    var instance = message[1];
    var event = message[2];
    var id = message[3];
    var err = message[4];
    var data = message[5];
    
    if (engine.module.eventAccess) {

        // get module instance
        instance = engine.module.eventAccess(session[engine.session_role], instance ? instance : '@', event);

    } else {

        // get module instance
        instance = instance ? engine.instances[instance] : engine;
    }

    // return if instance doesn't exists
    if (!instance) {
        return;
    }

    // get the link object
    var link = instance._links[id];

    // create link and emit link event
    if (!link) {

        // create a new link with a custom id
        link = createLink.call(instance, event, null, id, websocket, session);

        // ensure socket on link
        link.socket = link.socket || websocket;

        // emit the new crated link
        if (instance.emit) {
            instance.emit(event, link);
        } else {
            instance.event(event).emit(link);
        }
    }

    // handle message types
    switch (type) {

        // END
        case 0:
            end(link, err, data);
            break;

        // DATA
        case 1:

            // call data handlers
            if (link._h.length) {
                for (var i = 0; i < link._h.length; ++i) {
                    link._h[i].call(link._, err, data);
                }
            }
    }
};

var utils = require('./utils');
var streams = {};

/**
 * Create a connected link.
 *
 * @public
 * @param {object} The link configuration.
 * @param {function} The connection end handler.
 * @param {string} Optional custom link id.
 */
module.exports = function factory (id, instance, event, session) {
  
    // get cached stream
    if (streams[id]) {
        return streams[id];
    }
    
    // create link object
    var stream = utils.clone(SocketStream);
    
    // save server target info
    stream._id = utils.uid(3);
    stream._instance = instance;
    stream._event = event;
    
    // input data handlers
    stream._i = [];
    
    // output streams
    stream._o = [];
    
    // save session data in link
    if (session) {
        // save core session data shortcuts (role, userId, locale)
        stream[engine.session_role] = session[engine.session_role];
        stream[engine.session_user] = session[engine.session_user];
        stream[engine.session_locale] = session[engine.session_locale];
    }
    
    // save stream ref in cache
    streams[stream._id] = stream;
    
    // return link object
    return stream;
    
    // ..socket ref? global, ..or socket manager class
    // ..cache stream with an id? where lives the cache?
};

/**
 * Send and recive data with the Link class.
 *
 * @class wsLink
 */
var SocketStream = {
  
    // handler for incoming data
    data: function (handler, options) {
        this._i.push([handler, options]);
        return this;
    },
    
    write: function (err, data) {
        
        // write to out streams
        for (var o = 0, ol = this._o.length, out; o < ol; ++o) {
          
            // get ouputs input handlers
            out = this._o[o]._i;
            
            // call data handlers with err and data as arguments
            for (var i = 0, l = out.length; i < l; ++i) {
              
                //call data handler with eventStream instance as function scope
                var newData = out[i][0].call(this._, err, data, out[i][1]);
                
                // overwrite data with transformed data
                if (newData !== undefined) {
                    data = newData;
                }
            }
        }
        
        // end stream by sending null
        if (data === null) {
            this.end();
        }
        
        return this;
    },
    
    end: function () {
        // remove refs
        this._ = this._i = this._o = undefined;
        
        // send end message, before ending the link
        send.call(this, 0, err, data, function (error) {
            end(self, error || err, data);
        });
    },
    
    // pipe data to an event stream
    pipe: function (eventStream) {
        
        // append out streams
        this._o.push(eventStream);
        
        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return eventStream;
    }
};

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

