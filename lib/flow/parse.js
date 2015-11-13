"use strict";

var utils = require('./utils');
var CoreInst;

module.exports = function (coreInstance) {
    
    CoreInst = coreInstance;

    return function (config, callback) {

        var count = config[0] ? (config[0].length || 0) : 0;
        var called = 0;
        var event = [

            // data
            [
                // sections
                [
                    // sequence
                    []
                ]
            ]
        ];
        var check = function (err) {


            if (err) {
                // TODO handle error
            };

            if (count === ++called) {
                callback(null, event);
            }
        }

        // data sequence
        if (count > 0) {
            for (let i = 0, l = config[0].length; i < l; ++i) {
                resolveHandler(event[0], config[0][i], check);
            }
        }

        // error event
        if (config[1]) {
            event[1] = config[1];
        }
    };
};

function resolveHandler (sections, handler, callback) {

    var path = handler;
    var options = {};

    if (handler.constructor === Array) {
        path = handler[0];
        options = handler[1] || {};
    }

    var type = path[0];
    path = path.substr(1);

    var section = sections[sections.length - 1];

    if (type === ':' || type === '.') {

        return getMethodRef(
            section[0][(section[0].push(handler) - 1)],
            path,
            options,
            callback,
            (type === '.')
        );
    }
    
    if (type === '>' || type === '|') {

        section = [[]];
        sections.push(section);

        section.type = type;
 
        let net = path[0];
        path = path.substr(1);

        if (net === '*') {
            section[1] = [type];
            getMethodRef(section[1][1], path, options, callback);
            return;
        }
        
        options.net = net;
        section[1] = [type, [path, options]];
        callback();
    }
}

function getMethodRef (target, path, options, callback, once) {
    
    let instance;
    if (path.indexOf('/') > 1) {
        path = path.split('/');
        instance = path[0];
        path = path[1];
    }
    
    CoreInst.load(instance, options.session, function (err, instance) {

        if (err) {
            return callback(err);
        }

        // get handler function
        let fn = utils.path(path, [instance, global]);
        if (typeof fn !== 'function') {
            return callback(new Error('Flow.getEvent: Method "' + path + '" on instance "' + instance._name + '" not found.'));
        }
        
        target = [fn, options, instance, once];
        callback(null, target);
    });
}
