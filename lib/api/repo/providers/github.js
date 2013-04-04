var Github = require('github');
var gh = new Github({ version: '3.0.0' });

function createError (code, message, data) {

    switch (code) {
        case 401:
        case 403:
            return M.error(M.error.API_REPO_UNAUTHORIZED, 'github', data.user, data.repo);
        case 404:
            return M.error(M.error.API_REPO_NOT_FOUND, 'github', data.user, data.repo);
        default:
            // TODO ?
            return M.error(M.error.API_REPO_INVALID_API_REQUEST, 'github', '?', message);
    }
}

function getContent (data, callback) {

    getRepo(data, function (err, repo) {

        if (err) { return callback(err); }

        if (data.auth) {
            gh.authenticate(data.auth);
            delete data.auth;
        }

        gh.repos.getContent(data, function(err, fileData) {

            if (err) {
                var error;

                // 404 needs a path not found API_REPO_ error
                if (err.code === 404) {
                    error =  M.error(M.error.API_REPO_PATH_NOT_FOUND, 'github', data.user, data.repo, data.path);
                } else {
                    error = createError(err.code, err.message, data);
                }

                return callback(error);
            }

            var fileContent = new Buffer(fileData.content, 'base64').toString();
            callback(null, fileContent);
        });
    });
}

function getRepo (data, callback) {

    if (data.auth) {
        gh.authenticate(data.auth);
        delete data.auth;
    }

    gh.repos.get(data, function(err, result) {

        if (err) { return callback(createError(err.code, err.message, data)); }

        var repo = {
            source: 'github',
            owner: result.owner.loginname,
            name: result.name
        };

        callback(null, repo);
    });
}

exports.getContent = getContent;
exports.getRepo = getRepo;

