var request = require('request');

function createError (statusCode, body, data) {

    switch (statusCode) {
        case 401:
        case 403:
            return M.error(M.error.API_REPO_UNAUTHORIZED, 'bitbucket', data.user, data.repo);
        case 404:
            return M.error(M.error.API_REPO_NOT_FOUND, 'bitbucket', data.user, data.repo);
        default:
            // TODO repositories/raw?
            return M.error(M.error.API_REPO_INVALID_API_REQUEST, 'bitbucket', 'repositories/raw', body);
    }
}

function getContent (data, callback) {

    getRepo(data, function (err, repo) {

        if (err) { return callback(err); }

        request.get('https://api.bitbucket.org/1.0/repositories/' + repo.owner + '/' + repo.name + '/raw/master/' + data.path, { auth: data.auth }, function(err, response, body) {

            if (err) { return callback(err); }

            // 404 needs a path not found API_REPO_ error
            if (response.statusCode === 404) {
                return callback(M.error(M.error.API_REPO_PATH_NOT_FOUND, 'bitbucket', data.user, data.repo, data.path));
            }

            if (response.statusCode !== 200) {
                return callback(createError(response.statusCode, body, data));
            }

            callback(null, body);
        });
    });
}

function getRepo (data, callback) {

    var url = 'https://api.bitbucket.org/1.0/repositories/' + data.user + '/' + data.repo;
    request.get(url, { auth: data.auth }, function(err, response, body) {

        if (err) { return callback(err); }

        if (response.statusCode !== 200) {
            return callback(createError(response.statusCode, body, data));
        }

        try {
            var json = JSON.parse(body);
            var repo = {
                source: 'bitbucket',
                owner: json.owner,
                name: json.slug
            };

            return callback(null, repo);
        } catch (e) {
            callback(M.error(M.error.JSON_PARSE, url, e.message));
        }
    });
}

function getHeadCommit (data, callback) {

    if (!data.branch) {
        data.branch = 'master';
    }

    var url = 'https://api.bitbucket.org/1.0/repositories/' + data.user + '/' + data.repo + '/branches';

    request.get(url, { auth: data.auth }, function(err, response, body) {

        if (err) { return callback(err); }

        if (response.statusCode !== 200) {
            return callback(createError(response.statusCode, body, data));
        }

        try {
            var json = JSON.parse(body);

            // no such branch or the default is not "master"
            if (!json[data.branch]) {
                return callback(M.error(M.error.API_REPO_BRANCH_NOT_FOUND, 'bitbucket', data.user, data.repo, data.branch));
            }

            var commit = json[data.branch].raw_node;

            // just in case Bitbucket changes the API
            if (!commit) {
                return callback(M.error(M.error.API_REPO_INVALID_COMMIT_ID, 'bitbucket', data.user, data.repo, commit));
            }

            return callback(null, commit);

        } catch (e) {
            callback(M.error(M.error.JSON_PARSE, url, e.message));
        }
    });
}


exports.getContent = getContent;
exports.getRepo = getRepo;
exports.getHeadCommit = getHeadCommit;

