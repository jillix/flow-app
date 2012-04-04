var model = require(CONFIG.root + "/core/model/orient"),
    send  = require(CONFIG.root + "/core/send.js").send,
    mongo = require(CONFIG.root + "/db/mongo").db;

exports.getData = function(link) {

    mongo("sag-shops", "users_happy", function(err, db) {

        if (err) {
            send.internalservererror(link, err);
            return;
        }

        // all users
        if (link.path.length == 2) {

            db.find({}, { "system.cnr": 1, "_id": 0 }, { limit: 100 }).toArray(function(err, docs) {

                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                send.ok(link.res, docs);
            });
        }
        // one user
        else if (link.path.length == 3) {

            var fields = {
               "_id": 0,
               "system.cnr": 1,
               "adress.work": 1,
               "happybonus": 1
            };

            db.findOne({ "system.cnr": link.path[2] }, fields, function(err, doc) {

                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                send.ok(link.res, doc);
            });
        }
        // invalid
        else {
            send.notfound(link);
        }
    });
};

