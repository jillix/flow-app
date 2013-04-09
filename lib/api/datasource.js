//TODO see the todo below
var dataSources = {
    // AktionShop
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
    cartDS: {
        type: "mongo",
        db: "aktionshop",
        collection: "carts"
    },
    // SalonGenf
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
    // PartnerLogin
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
    // Demo DS for testing. It has not to be 'testDS'.
    mongoDS: {
        type: 'mongo',
        db: 'test',
        collection: 'col_two'
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

