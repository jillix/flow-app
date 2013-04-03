var Github = require('github');
var gh = new Github({ version: '3.0.0' });


function getContent (data, callback) {

    if (data.auth) {
        gh.authenticate(data.auth);
        delete data.auth;
    }

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

