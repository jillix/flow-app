var send  = require(CONFIG.root + "/core/send.js").send,
    mongo = require(CONFIG.root + "/db/mongo").db;

var url = require("url"),
    qs  = require("querystring");


exports.getBranches = function(link) {

    mongo("sag", "branch", function(err, db) {

        if (err) {
            send.internalservererror(link, err);
            return;
        }

        // all users
        if (link.path.length == 0) {

            var branchFilter = {};
            var sessionData = link.session.data || {};

            if (sessionData.branch) {

                var splits = sessionData.branch.split(",");

                if (splits.length > 1) {
                    branchFilter = { "short" : splits[0] };
                } else {
                    branchFilter = { "short" : sessionData.branch };
                }
            }
            
            db.find(branchFilter).toArray(function(err, docs) {

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

        var urlObj = url.parse(link.req.url);
        var queryObj = qs.parse(urlObj.query);
 
        var archiveFilter = {
            "$elemMatch": {
                "archived": { $exists: 0 }
            }
        };

        // if this user has a branch in his session, always use it as filter
        var sessionData = link.session.data || {};
        var userBranch = "";

        if (sessionData.branch) {
            userBranch = sessionData.branch.toString();
        }

        // branch filtering
        var branch = userBranch || (queryObj.branch !== "0" ? queryObj.branch : "");
        if (branch) {

            // DD Marketing need to see all D* + Lauper order items
            var splits = branch.split(",");

            if (splits.length > 1) {
                archiveFilter["$elemMatch"].branch = { "$in": splits };
            } else {
                archiveFilter["$elemMatch"].branch = branch;
            }
        }

        // archive filtering
        var archive = queryObj.archive;
        if (archive === "1") {
            archiveFilter = {
                "$not": archiveFilter
            };
        }

        // search filtering
        var search = (queryObj.search || "").toLowerCase().trim();
        var searchWords = search === "" ? [] : search.split(" ");

        // paging
        var skip = queryObj.skip || 0;
        var limit = queryObj.limit || 0;

        var isExport = queryObj["export"] ? true : false;

        var mongoQuery = {
            "items": archiveFilter
        }

        console.log(JSON.stringify(mongoQuery));

        db.find(mongoQuery).toArray(function(err, docs) {

            if (err) {
                send.internalservererror(link, err);
                return;
            }

            // all the orders contain item that match the filters (branch and archive)
            // we have to filter out now all the items that should not be visible by some branches

            var orders = [];

            for (var i in docs) {
                
                var order = docs[i];

                // filter only the mathing orders
                if (searchWords.length) {

                    var meta = order.meta || [],
                        metaLength = meta.length;
                    var found = false;

                    for (var k = 0; k < metaLength && !found; k++) {
                        for (var l = 0; l < searchWords.length && !found; l++) {
                            if (meta[k].indexOf(searchWords[l]) != -1) {
                                found = true;
                            }
                        }
                    }

                    if (!found) {
                        continue;
                    }
                }

                var items = [];

                // this will help us eliminate in archive view all the orders
                // that don't have at least one item matching to the users branch
                var hasBranch = false;

                for (var j in order.items) {

                    var item  = order.items[j];

                    if (!branch || (branch && branch.indexOf(item.branch) > -1)) {
                        hasBranch = true;
                    }

                    if (!userBranch || (branch && branch.indexOf(item.branch) > -1)) {
                        item.readonly = false;
                        items.push(item);
                    } else {
                        item.readonly = true;
                        if (branch !== "LAUPER") {
                            items.push(item);
                        }
                    }
                }

                // empty this order if there are no items for this branch
                if (!hasBranch) {
                    items = [];
                }

                // overwrite the initial items after filtering
                order.items = items;

                if (items.length) {
                    orders.push(order);
                }
            }

            if (!isExport) {
                var length = orders.length;
                orders = orders.splice(skip, limit || length);
                orders.unshift(length);
                send.ok(link.res, orders);
            }
            else {
                link.res.headers["content-type"] = "text/csv";
                link.res.headers["content-disposition"] = "attachment; filename=export.csv";
                var csv = generateExport(orders, link.session.loc);
                send.ok(link.res, csv);
            }
        });
    });
};


function generateExport(orders, lang) {
    var NEW_LINE = "\r\n";
    var SEPARATOR = ";";

    var result = "";

    switch (lang) {
        case "fr":
            result += "Region;Branche;Besuchsgebiet;Numéro de client;Entreprise;Numéro d'ordre;Date d'ordre;Numéro d'article;Désignation;Quantité;Net;Prämie;Währung;";
        case "it":
            result += "missing Italian header translation";
            break;
        default:
            result += "Region;Filiale;Besuchsgebiet;Kundennummer;Firma;Bestellnummer;Bestelldatum;Art. Nr.;Bezeichnung;Menge;Netto;Prämie;Währung;";
    }

    result += NEW_LINE;

    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];

        for (var j = 0; j < order.items.length; j++) {
            var item = order.items[j];

            var line = "";

            line += (order.customer.region || "") + SEPARATOR;
            line += (order.customer.branch || "") + SEPARATOR;
            line += (order.customer.vis_region || "") + SEPARATOR;
            line += (order.customer.cnr || "") + SEPARATOR;
            line += (order.adress.company || "") + SEPARATOR;
            line += (order._c || "") + SEPARATOR;
            line += (order.date || "") + SEPARATOR;

            line += (item.nr || "") + SEPARATOR;
            line += (item.caption || "") + SEPARATOR;
            line += (item.number || "") + SEPARATOR;
            line += (item.netto || "") + SEPARATOR;

            line += ("dd" || "") + SEPARATOR;
            line += (order.currency || "") + SEPARATOR;

            result += line + NEW_LINE;
        }
    }

    return result;
}


function dateToInt(date) {

    var day = "0" + date.getDate();
    var month = "0" + (date.getMonth() + 1);
    var year = date.getFullYear();

    return parseInt(year + month.substr(-2) + day.substr(-2));
}

