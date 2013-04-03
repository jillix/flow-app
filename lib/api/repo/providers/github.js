var Github = require('github');
var gh = new Github({ version: '3.0.0' });

function getContent (data, callback) {

    // TODO add authentication
    var credentials = {
        type: 'basic',
        username: 'your_username',
        password: 'your_password'
    };

    // TODO delete when authentication is implemented
    if (credentials.username === 'your_username') {
        var message = 'Provide your credentials in: ' + __dirname + '/github.js';
        console.error(message);
        return callback(message);
    }

    gh.authenticate(credentials);

    gh.repos.getContent(data, function(err, fileData) {

        if (err) { callback(err); }

        var fileContent = new Buffer(fileData.content, 'base64').toString();
        try {
            var json = JSON.parse(fileContent);
            callback(null, json);
        } catch (e) {
            callback('Invalid JSON file');
        }
    });
}

exports.getContent = getContent;

