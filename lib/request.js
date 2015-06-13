var parse = require('url').parse;
var defaultHeader = {'content-type': 'text/plain'};
var Instance = require('./instance');
var HttpStream = require('./client/stream_http');

/**
 * Handle http requests.
 *
 * @public
 * @param {object} The session object.
 * @param {object} The http request object.
 * @param {object} The http response object.
 */
module.exports = function handler (session, req, res) {

    // create http stream object
    var stream = HttpStream(session, req, res);
    var eventName;
    var instance;
    
    switch (stream.path[0]) {
        
        // handle operation requests
        case engine.operation_id:
            
            // ceck if it's a valid operation url
            if (stream.path.length < 2 || !stream.path[1] || !stream.path[2]) {
                return stream.end(400, 'Invalid operation url.');
            }
            
            // set engine core module as instance
            if (stream.path[1] === engine.operation_id) {
    
                // set engine core module as instance
                instance = engine;
    
                // remove operation key and instance name from path
                stream.path = stream.path.slice(2);
    
                // handle external files that must be wrapped
                if (stream.path[0] === engine.public_file_id) {
                    stream.path = stream.path.slice(1);
                    eventName = 'extFile';
    
                // set event name to the core opertation to fetch files
                } else {
                    eventName = 'file';
                }
    
            // get cached instance and check access
            } else {
    
                // remove operation key, module instance name and event from path
                stream.path = stream.path.slice(3);
                
                // get cached instance
                instance = instance_cache.get(stream.path[1]);
                
                if (!instance) {
                    // TODO load instance!
                }
                
                // get the event name
                eventName = stream.path[2];
            }
            
            break;

        // handle public file requests
        case engine.public_file_id:
            eventName = 'public';
            instance = engine;
            break;
        
        // handle client requests
        default:
            eventName = 'client';
            instance = engine;
    }
    
    // check event access
    if (!Instance.eventAccess(instance, stream[engine.session_role], eventName)) {

        // send a "not found" if instance is not found or access denied
        return stream.end(404, 'Instance or operation not found.');
    }
    
    // emit stream
    instance.emit(eventName, stream);
    
    // resume request (emit data events)
    req.resume();
};
