
// model
var Data = {

    // send model request
    req: function (query, data, callback) {
        var self = this;

        // emit server event
        self._.emit('Q>', {
            m: self._name,
            q: query,
            d: data
        }, function (err, data) {

            // save current data
            self.data = data;

            // callback
            callback(err, data);
        });
    }
};

// model
// TODO add an option for live updates (push)
// TODO update a connected view on live update
function factory (model, config) {
    var self = this;

    model._ = self;
    model.data = [{}];

    // save flat schema in models cache
    model.schema = self._flat(config);

    // save model in instance
    self.model[config.name] = model;
}


function fetch (event, data, callback) {
    var self = this;
    var model = data.model;
    var query = data.query;
    data = data.data;

    if (!model || !query) {
        return callback('No model or query.');
    }

    if (!self.model || !self.model[model]) {
        return callback('Model not found.');
    }

    self.model[model].req(query, data, function (err, data) {

        if (err) {
            return callback(err);
        }

        // emit callback event
        callback(null, {data: data});
    });
}
