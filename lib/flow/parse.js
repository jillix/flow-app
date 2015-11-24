"use strict";

var utils = require('./utils');
var CoreInst;

module.exports = function (coreInstance) {
    
    CoreInst = coreInstance;

    return function (instance, options, callback) {

        var config = instance._flow[options.emit];
        var count = config.d ? (config.d.length || 0) : 0;
        var called = 0;
        var event = {d:[/*S*/[/*H*/[/*H(o)*/]]]};
        var errorHappend;
        var check = function (err) {

            if (errorHappend) {
                return;
            }

            if (err) {
                errorHappend = true;
                return callback(err);
            };

            if (count === ++called) {
                callback(null, event);
            }
        }

        // data sequence
        if (count > 0) {
            for (var i = 0, l = config.d.length; i < l; ++i) {
                resolveHandler(instance, options, event.d, config.d[i], check);
            }
        }

        // end event
        if (config.e) {
            event.e = config.e;
        }

        // error event
        if (config.r) {
            event.r = config.r;
        }
    };
};

function resolveHandler (instance, options, sections, handler, callback) {

    var path = handler;
    var args = {};

    if (handler.constructor === Array) {
        path = handler[0];
        args = handler[1] || {};
    }

    var type = path[0];
    path = path.substr(1);

    var section = sections[sections.length - 1];

    if (type === ':' || type === '.') {
        section[0].push(null);
        return getMethodRef(
            instance,
            options,
            {
                position: section[0].length - 1,
                target: section[0],
                path: path,
                args: args,
                once: (type === '.'),
            },
            callback
        );
    }
    
    if (type === '>' || type === '|') {

        section = [[], [type]];
        sections.push(section);
 
        var net = path[0];
        path = path.substr(1);

        if (net === '*') {
            section[1] = [type];
            return getMethodRef(
                instance,
                options,
                {
                    position: 1,
                    target: section[1],
                    path: path,
                    args: args
                },
                callback
            );
        }
        
        section[1][1] = [path, args];
        callback();
    }
}

function getMethodRef (instance, options, method, callback) {

    var instanceName = instance._name;
    var path = method.path; 

    if (path.indexOf('/') > 0) {
        path = path.split('/');
        instanceName = path[0];
        path = path[1];
    }

    // merge flow emit options to args
    Object.keys(options).forEach(function (key) {
        if (method.args[key] === undefined) {
            method.args[key] = options[key];
        }
    });

    // make args immutable
    Object.freeze(method.args);
    
    CoreInst.load(instanceName, options.session, function (err, instance) {

        if (err) {
            return callback(err);
        }

        // get handler function
        var fn = utils.path(path, [instance, global]);
        if (typeof fn !== 'function') {
            return callback(new Error('Flow.getEvent: Method "' + path + '" on instance "' + instance._name + '" not found.'));
        }
        
        method.target[method.position] = [fn, method.args, instance, method.once];
        callback();
    });
}
