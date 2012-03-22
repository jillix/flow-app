var model = require(CONFIG.root + "/core/model/orient"),
    send = require(CONFIG.root + "/core/send.js").send;

exports.getData = function(link) {

    model.getComponents(function(err, results) {

        send.ok(link.res, results);
    });
};

