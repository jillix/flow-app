
var Module = {};

// instance
function factory (inst, config) {

    // extend module instance
    inst._module = config.module;

    // append view and model cache by default to every instance
    inst.view = {};
    inst.model = {};
    inst._renderOrder = [];

    // attach send handler to instance configured client events
    if (config.send) {
        for (var e = 0; e < config.send.length; ++e) {
            inst.on('^' + config.send[e] + '$', send(config.send[e]));
        }
    }
}
