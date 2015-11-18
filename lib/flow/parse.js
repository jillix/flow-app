"use strict";

var utils = require('./utils');
var CoreInst;

module.exports = function (coreInstance) {
    
    CoreInst = coreInstance;

    return function (instance, options, callback) {

        var config = instance._flow[options.emit];
        var count = config[0] ? (config[0].length || 0) : 0;
        var called = 0;
        var event = [[[[]]]];
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
            for (let i = 0, l = config[0].length; i < l; ++i) {
                resolveHandler(instance, options, event[0], config[0][i], check);
            }
        }

        // error event
        if (config[1]) {
            event[1] = config[1];
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
 
        let net = path[0];
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

    // save session info on args
    method.args.session = options.session;
    method.args.req = method.args.req || options.req;
    method.args.res = method.args.res || options.res;
    
    CoreInst.load(instanceName, options.session, function (err, instance) {

        if (err) {
            return callback(err);
        }

        // get handler function
        let fn = utils.path(path, [instance, global]);
        if (typeof fn !== 'function') {
            return callback(new Error('Flow.getEvent: Method "' + path + '" on instance "' + instance._name + '" not found.'));
        }
        
        method.target[method.position] = [fn, method.args, instance, method.once];
        callback();
    });
}
