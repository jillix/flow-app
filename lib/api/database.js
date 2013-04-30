
function open (dataSource, callback) {

    if (!dataSource) {
        return callback('Invalid data source.');
    }

    switch (dataSource.type) {

        case 'mongo':
            if (!dataSource.db) {
                return callback('This data source is missing the "db" property.');
            }

            M.mongo.connect(dataSource.db, callback);
            return;

        case 'orient':
            if (!dataSource.db) {
                return callback('This data source is missing the "db" property.');
            }

            M.orient.connect(dataSource.db, callback);
            return;

        default:
            return callback('Invalid data source type: ' + dataSource.type);
    }
}

exports.open = open;
