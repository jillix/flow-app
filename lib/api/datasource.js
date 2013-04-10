//TODO see the todo below
var dataSources = {

    // demo DS for testing
    mongoDS: {
        type: 'mongo',
        db: 'test',
        collection: 'col_two'
    },

    // AktionShop (0101)
    categoriesDS: {
        type: 'mongo',
        db: 'aktionshop',
        collection: 'categories'
    },
    articlesDS: {
        type: 'mongo',
        db: 'aktionshop',
        collection: 'articles'
    },

    // SalonGenf (0108)
    happyDS: {
        type: "mongo",
        db: "sag-shops",
        collection: "users_happy"
    },
    quizDS: {
        type: "mongo",
        db: "sag",
        collection: "quiz"
    },

    // PartnerLogin (0100)
    usersDS: {
        type: "mongo",
        db: "partnerlogin",
        collection: "users"
    },
    adminsDS: {
        type: "mongo",
        db: "partnerlogin",
        collection: "admins"
    },

    // LiqshopOrders (0051)
    liqshopAdminsDS: {
        type: "mongo",
        db: "sag",
        collection: "admins"
    },
    liqshopOrdersDS: {
        type: "mongo",
        db: "sag",
        collection: "orders_new"
    },
    liqshopBranchesDS: {
        type: "mongo",
        db: "sag",
        collection: "branch"
    }
};


function resolve (name, callback) {

    if (!name) {
        return callback('Invalid data source name.');
    }

    // TODO here comes the API that gets the data source for application/user
    var ds = dataSources[name];

    if (!name) {
        return callback('Invalid data source for this application: ' + name);
    }

    callback(null, ds);
}

exports.resolve = resolve;

