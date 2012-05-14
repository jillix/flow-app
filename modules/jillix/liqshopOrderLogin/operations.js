var model = require(CONFIG.root + "/core/model/orient"),
    send  = require(CONFIG.root + "/core/send.js").send

var url = require("url"),
    qs  = require("querystring");


exports.login = function(link) {

    send.ok(link.res, "OK");
};

