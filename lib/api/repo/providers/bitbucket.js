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

        var params = buildAuthParams(data);
        if (!params) {
            return callback(M.error(M.error.API_REPO_MISSING_AUTHENTICATION, 'bitbucket', data.user, data.repo));
        }

        request.get('https://api.bitbucket.org/1.0/repositories/' + repo.owner + '/' + repo.name + '/raw/master/' + data.path, params, function(err, response, body) {

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

function buildAuthParams(data) {

    if (!data) {
        return null;
    }

    // when basic  authentication is already provided, use it
    if (data.auth) {
        return { auth: data.auth };
    }

    // othewise we must have at least the OAuth secrets
    if (data.secrets) {
        return { oauth: {
            consumer_key: data.secrets.clientId,
            consumer_secret: data.secrets.secretKey,
            token: data.auth.access_token,
            token_secret: data.auth.access_token_secret
        } };
    }

    // no authentication, bad luck!
    return null;
}

function getRepo (data, callback) {

    var url = 'https://api.bitbucket.org/1.0/repositories/' + data.user + '/' + data.repo;

    var params = buildAuthParams(data);
    if (!params) {
        return callback(M.error(M.error.API_REPO_MISSING_AUTHENTICATION, 'bitbucket', data.user, data.repo));
    }

    request.get(url, params, function(err, response, body) {

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
        
        var json;
        
        try {
            json = JSON.parse(body);
        } catch (e) {
            return callback(M.error(M.error.JSON_PARSE, url, e.message));
        }
        
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
    });
}

// TODO Must this to be moved on the top 
//      of content of this file?
var BitBucket = require("./bitbucket_api").BitBucket;
var OAuth = require("oauth").OAuth;

var bb = new BitBucket(true);
var repo = bb.getRepoApi();

function getUserRepos (user, data, callback) {
   
    bb.authenticateOAuth(getOauth(data.secrets), data.auth.access_token, data.auth.access_token_secret);

    bb.getUsersApi().getUsersData(user, function (err, userInfo) {

        if (err) { return callback(err); }

        callback(null, userInfo.repositories);
    });
}

function hasFile (data, callback) {
    
    getContent(data, function (err, fileData) {
        
        if (err) {
            callback(err, null, data);
            return;
        }

        callback(null, fileData, data);
    });

}

function getOauth(secrets) {
    return new OAuth(
        "https://bitbucket.org/api/1.0/oauth/request_token/",
        "https://bitbucket.org/api/1.0/oauth/access_token/", 
        secrets.clientId,
        secrets.secretKey,
        "1.0",
        secrets.loginLink,
        "HMAC-SHA1"
    );
}

exports.getContent = getContent;
exports.getRepo = getRepo;
exports.getHeadCommit = getHeadCommit;
exports.getUserRepos = getUserRepos;
exports.hasFile = hasFile;
