//TODO see the todo below
var dataSources = {
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

