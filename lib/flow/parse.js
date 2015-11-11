module.exports = function (config, callback) {

    callback(null, config);
/*
    if (errorHappend) {
        return;
    }

    if (config && config.constructor === Error) {
        errorHappend = true;
        return callback(config);
    }

    if (count === flow.length) {
        return callback(null, handlers);
    }

    if (!config) {
        return;
    }

    if (typeof config === 'string') {
        config = [config];
    }

    let instName = instance._name;
    let method = config[0];
    let args = config[1];
    let type = method[0];
    method = method.substr(1);

    // get target instance
    if (method.indexOf('/') > 0) {
        method = method.split('/');
        instName = method[0];
        method = method[1];
    }

    handlers[section] = handlers[section] || {};

    if (type === '>' || type === '|' ||  type === '*') {
        // create sections
        handlers[++section] = {};
        handlers[section][type] = [[instance, method, {}]];
    } else {
        // append handlers
        handlers[section][type] = handlers[section][type] || [];
        handlers[section][type].push([instance, method, config[1]]);
    }

    var reference = [handlers[section][type], handlers[section][type].length - 1];
    CoreInst.load(instName, options.session, function (err, instance) {

        ++count;

        if (err) {
            return parse(err);
        } 

        // get handler function
        let ref = reference[0][reference[1]];
        let fn = utils.path(ref[1], [instance, global]);
        if (typeof fn !== 'function') {
            return parse(new Error('Flow.getEvent: Method "' + ref[1] + '" on instance "' + instance._name + '" not found.'));
        }
        ref[1] = fn;
        
        parse();
    }); 
*/
};
