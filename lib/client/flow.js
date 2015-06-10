var Stream = require('./stream');
var utils = require('./utils');

/**
 * Create a new config event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
module.exports = function flowHandler (flow, adapter) {
    var module_instance = this._;
    var stream;

    /*
        {
            on: "event",
            to: "(:)instance",
            load: [""],
            emit: "event",
            call: "path"
            data: ["path", {config}]
        }
    */
    
    // handle "to" config
    if (typeof flow.to === 'string') {
      
        // check if it's an external link
        if (flow.to[0] === ':') {
          
            // create external stream
            if (flow.to.split(':')[0] === 'http') {
                stream = Stream.http(module_instance);
            } else {
                stream = Stream.ws(module_instance);
            }
        }

        // get target module instance, or continue if not found
        // and check module instance acces for server side
        else if (
            (!(module_instance = engine.instances[flow.to])) ||
            (this.role && !utils.roleAccess(module_instance, this.role))
        ) {
            return console.error('Flow target instance "' + flow.to + '" is not found.');
        }
    }
    
    // create individual stream
    stream = stream || Stream.local(module_instance);
    
    // add data handler to transmitter
    // TODO pass config to transform handler
    if (flow.data && (flow.data = getMethodFromPath(flow.data, module_instance))) {
        stream.data(flow.data);
    }
    
    // pipe to origin stream after transform
    stream.pipe(this).pipe(stream);

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
