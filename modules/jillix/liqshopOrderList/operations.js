var model = require(CONFIG.root + "/core/model/orient"),
    send  = require(CONFIG.root + "/core/send.js").send,
    mongo = require(CONFIG.root + "/db/mongo").db;


exports.getBranches = function(link) {

    mongo("sag", "branch", function(err, db) {

        if (err) {
            send.internalservererror(link, err);
            return;
        }

        // all users
        if (link.path.length == 0) {

            db.find({ "companyName" : { $exists : true }}).toArray(function(err, docs) {

                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                send.ok(link.res, docs);
            });
        }
    });
};


exports.getOrders = function(link) {

    mongo("sag", "orders_new", function(err, db) {

        if (err) {
            send.internalservererror(link, err);
            return;
        }

        // all users
        if (link.path.length == 0) {

            db.find({ "_c" : { $exists : true }}).toArray(function(err, docs) {

                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                send.ok(link.res, docs);
            });
        }

        // one user
        else if (link.path.length == 1) {

            var fields = {
               "_id": 0,
               "system.cnr": 1,
               "adress.work": 1,
               "happybonus": 1
            };

            db.findOne({ "system.cnr": link.path[0] }, fields, function(err, doc) {

                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                send.ok(link.res, doc);
            });
        }

        // TODO this should be in another function/operation (for a clean interface)
        // one user
        // .../cnr/hp/[set|add|new][/value]
        else if (link.path.length == 4 || link.path.length == 3) {

            // the operation must be "hp" for noe
            if (link.path[1] !== "hp") {
               send.notfound(link, "Operation type not implemented: " + link.path[1]); 
               return;
            }

            db.findOne({ "system.cnr": link.path[0] }, function(err, doc) {

                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                var update = null;
                var oldPoints = doc.happybonus ? doc.happybonus.points : null;


                // the hp operation
                switch (link.path[2]) {

                    case "add":
                        update = {
                            "$inc": { "happybonus.points": parseInt(link.path[3]) },
                            "$push": { "happybonus.history": {
                                date: dateToInt(new Date()),
                                operation: link.path[2],
                                old: { points: oldPoints },
                                new: { points: parseInt(link.path[3]) || 0 }
                            }}
                        };
                        break;

                    case "set":
                        update = {
                            "$set": { "happybonus.points": parseInt(link.path[3]) },
                            "$push": { "happybonus.history": {
                                date: dateToInt(new Date()),
                                operation: link.path[2],
                                old: { points: oldPoints },
                                new: { points: parseInt(link.path[3]) || 0 }
                            }}
                        };
                        break;

                    case "new":
                        update = {
                            "$set": { happybonus: { since: dateToInt(new Date()), points: 0 } },
                            "$push": { "happybonus.history": {
                                date: dateToInt(new Date()),
                                operation: link.path[2],
                                old: { points: oldPoints },
                                new: 0
                            }}
                        };
                        break;

                    case "undo":
                        var history = doc.happybonus.history,
                            lastOp = history[history.length - 1];

                        update = {
                            "$set": { "happybonus.points": lastOp.old.points },
                            "$pop": { "happybonus.history": 1 }
                        };
                        break;

                    default:
                        send.notfound(link, "Operation not valid: " + link.path[2]);
                        return;

                }

                db.update({ "system.cnr": link.path[0] }, update, function(err, count) {

                    if (err) {
                        send.internalservererror(link, err);
                        return;
                    }

                    if (count != undefined  && count != 1) {
                        send.internalservererror(link, "There were " + count + " users updated!");
                        return;
                    }

                    send.ok(link.res, { updated: link.path[0] });
                });
            });
        }

        // invalid
        else {
            send.notfound(link);
        }
    });
};


function dateToInt(date) {

    var day = "0" + date.getDate();
    var month = "0" + (date.getMonth() + 1);
    var year = date.getFullYear();

    return parseInt(year + month.substr(-2) + day.substr(-2));
}

