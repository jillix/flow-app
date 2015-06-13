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
    
    // send data
    write: function (err, data) {
        
        // write to out streams
        for (var o = 0, ol = this._o.length, out; o < ol; ++o) {
          
            // get ouputs input handlers
            out = this._o[o];
            
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
        this._o.push(eventStream._i);
        
        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return eventStream;
    },

    /**
     * Send a data message over the link.
     *
     * @public
     * @param {object} The error data.
     * @param {object} The data object.
     */
    send: function (err, data) {

        // send message
        send.call(this, 1, err, data);
        return this;
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
