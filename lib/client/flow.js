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

    /*
        {
            on: "event",
            load: [""],
            to: "(:)instance",
            emit: "event",
            call: "path"
            transform: ["path", {config}]
        }
    */

    // get target module instance, or continue if not found
    // and check module instance acces for server side
    if (
        (flow.to && !(module_instance = engine.instances[flow.to])) &&
        (eventStream.role && !utils.roleAccess(module_instance, eventStream.role))
    ) {
        return;
    }

    // emit transmitter to other flow handlers
    if (typeof flow.emit === 'string') {
        module_instance.emit(flow.emit, this);
    }

    // add data handler to transmitter
    // TODO pass config to transform handler
    if ((flow.transform = getMethodFromPath(flow.transform, module_instance))) {
        // TODO data handler are receiver specific
        this.data(flow.transform, module_instance);
    }

    // pass transmitter to receiver function
    if ((flow.receiver = getMethodFromPath(flow.receiver, module_instance))) {
        flow.receiver.call(module_instance, this);
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
        console.error('Flow method is not a function.\nValue for "' + path + '" is:', _path);
        return;
    }

    if (typeof _path === 'function') {
        return _path;
    }
}
