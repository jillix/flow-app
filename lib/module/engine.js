var Flow = require('./flow');
var Instance = require('./instance');

Flow({
    module: require.fromFlow,
    composition: [['flow', {'emit': '@C'}]]
});

// client flag
engine.client = true;
engine._name = '@';

// extend engine with logging methods
engine.log = require('./logs') || function (err) {return err};

// listen to core engine events
engine._flow = {
    'IC': [[Instance.cache]],
    'I': [[
        ['>flow', {'emit': '@C'}],
        require.fromFlow,
        Instance.build
    ]],
    'M': [[['flow', {'emit': '@M'}]]]
};

// load entrypoint
engine.start();
