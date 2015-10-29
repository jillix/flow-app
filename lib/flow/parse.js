module.exports = function (config, callback) {

    // TODO parse flow config

    // TODO get handler refs?

    return config;
};

/*
function parseConfig (flow, instance) {

    var method = {
        i: instance,
        o: {}
    };

    if (typeof flow === 'function') {
        method.m = flow;
        return method;
    }

    if (flow instanceof Array) {
        method.m = flow[0];
        method.a = flow[1];

        // TODO implement option handler. reuse transform handler
        method.o = flow[2] || transform;
    } else {
        method.m = flow;
    }

    var type = method.m[0];
    method.h = type === '>' ? 1 : type === ':' ? 2 : type === '!' ? 3 : 0;

    if (method.h) {
        method.m = method.m.substr(1);
    }

    if (method.m.indexOf('/') > 0) {
        method.m = (instance = method.m.split('/'))[1];
        method.i = instances[instance[0]] || instance[0];
    }

    return method;
}

function getMethodFunction (method) {

    if (typeof method.m === 'function') {
        return method;
    }

    var _path = method.m;
    if (
        typeof _path === 'string' &&
        typeof (method.m = utils.path(method.m, [method.i, global])) !== 'function'
    ) {
        console.log('E', new Error('Flow method "' + _path + '" is not a function. Instance:' + method.i._name));
        return method;
    }

    return method;
}*/
