var LocalStream = require('./stream_local');
var SocketStream = require('./stream_socket');
var utils = require('./utils');

/**
 * Create a new config event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
module.exports = function flowHandler (originStream, flow, adapter) {
    var module_instance = this;
    var stream;
    
    // handle "to" config
    if (typeof flow.to === 'string') {
      
        // create external socket stream
        if (flow.to[0] === ':') {
            stream = SocketStream(null, flow.to.substr(1), flow.emit);
        }

        // get target module instance, or continue if not found
        // and check module instance acces for server side
        else if (
            (!(module_instance = engine.instances[flow.to])) ||
            (
                originStream[engine.session_role] &&
                !utils.roleAccess(
                    module_instance,
                    originStream[engine.session_role]
                )
            )
        ) {
            return console.error('Flow target instance "' + flow.to + '" is not found.');
        }
    }
    
    // create individual stream
    stream = stream || LocalStream(module_instance);
    
    // add data handler to transmitter
    if (flow.data instanceof Array && (flow.data[0] = getMethodFromPath(flow.data[0], module_instance))) {
        stream.data(flow.data[0], flow.data[1]);
    }
    
    // pipe to origin stream after transform
    stream.pipe(originStream).pipe(stream);

    // emit transmitter to other flow handlers
    if (typeof flow.emit === 'string') {
        module_instance.emit(flow.emit, stream);
    }

    // pass transmitter to receiver function
    if (flow.call && (flow.call = getMethodFromPath(flow.call, module_instance))) {
        flow.call.call(module_instance, stream);
    }
};

/**
 * Return a function or undefined.
 */
function getMethodFromPath (path, module_instance) {
  
    var _path;

    if (
        typeof path === 'string' &&
        typeof (_path = utils.path(path, [engine.handlers, module_instance, global])) !== 'function'
    ) {
        console.error('Flow method is not a function. Value for "' + path + '" is:', _path);
        return;
    }

    if (typeof _path === 'function') {
        return _path;
    }
}
