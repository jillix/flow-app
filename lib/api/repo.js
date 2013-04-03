var fs = require('fs');
var cp = require('child_process');

var providers = require('./repo/providers');
// TODO this is a temporary solution until we have authentication
var credentials = require('./credentials');

var VALID_REPO_URLS = {
    ssh: /^(.+)@(.+)(\.com|\.org):(.+)\/(.+)\.git$/,
    https: /^https:\/\/(.+@)?(.+)(\.com|\.org)\/(.+)\/(.+)\.git$/,
    git: /^git:\/\/(.+@)?(.+)(\.com|\.org)\/(.+)\/(.+)\.git$/
};

/**
 * Validates a URL and returns true if this is a valid suported Git URL.
 */
function validateUrl (url) {

    if (typeof url !== 'string') {
        return false;
    }

    for (var key in VALID_REPO_URLS) {
        if (url.match(VALID_REPO_URLS[key])) {
            return true;
        }
    }
    return false;
}

/**
 * Tries to get the content of a JSON file from a repository.
 */
function getJsonFromRepo (url, path, callback) {

    // the url must be a valid Git URL
    if (!M.repo.validateUrl(url)) {
        return callback(M.error(M.error.API_REPO_INVALID_URL, url));
    }

    // find the source, owner, and name of the project
    var son = extractSonFromRepoFromUrl(url);

    // there must be a provider for the project source
    if (!providers[son.source]) {
        return callback(M.error(M.error.API_REPO_UNSUPPORTED_PROVIDER, son.source));
    }

    // prepare the data for the provider REST API call
    // (currently using the Github format)
    data = {
        user: son.owner,
        repo: son.name,
        path: path
    };

    var repro = providers[son.source];
    var funct = 'getContent';

    // check if this provider implements the needed method
    if (typeof repro[funct] !== 'function') {
        return callback(M.error(M.error.API_REPO_PROVIDER_METHOD_NOT_IMPLEMENTED, son.source, funct));
    }

    // TODO this is a temporary solution until we have authentication
    var auth = credentials[son.source];
    if (auth) {
        data.auth = auth;
    }

    // TODO delete when authentication is implemented
    if (auth.username === 'your_username') {
        var message = 'Provide your credentials in: ' + __dirname + '/credentials.json';
        console.error(message);
        return callback(message);
    }


    // call the function on this provider
    repro[funct](data, callback);
}

/*
 * Extracts the source/owner/name of a project given its Git repo URL.
 * No validation of the URL is performed. Make sure you validate it first!
 */
function extractSonFromRepoFromUrl (url) {

    var match = url.match(/^(.{3,5}):\/\//);
    var proto = 'ssh';

    if (match) {
        proto = match[1];
    }

    if (!VALID_REPO_URLS[proto]) {
        throw new Error('Protocol not implemented: ' + proto);
    }

    match = url.match(VALID_REPO_URLS[proto]);
    var son = {
        source: match[2].toLowerCase(),
        owner: match[4],
        name: match[5]
    };

    return son;
}

/**
 * Clones a git repo to a certain directory. The directory must exist
 */
function cloneToDir (url, dirName, baseName, callback) {

    if (!M.repo.validateUrl(url)) {
        return callback(M.error(M.error.API_REPO_INVALID_URL, url));
    }

    fs.exists(dirName + '/' + baseName, function(exists) {

        if (exists) {
            return callback(M.error(M.error.API_REPO_CLONE_DESTINATION_ALREADY_EXISTS, dirName + '/' + baseName));
        }

        var options = {
            cwd: dirName
        };
        var git = cp.spawn('git', ['clone', url, baseName], options);

        if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
            git.stdout.on('data', function(data) {
                console.log(data.toString());
            });
            git.stderr.on('data', function(data) {
                console.error(data.toString());
            });
        }

        git.on('exit', function(code) {

            if (code) {
                return callback(M.error(M.error.API_REPO_GIT_OPERATION_FAILED, 'clone', 'exit code ' + code));
            }

            callback(null);
        });
    });
}

function checkoutTag(repoDir, tag, callback) {

    fs.exists(repoDir + '/.git', function(exists) {

        if (!exists) {
            return callback(M.error(M.error.API_REPO_NOT_GIT, repoDir));
        }

        var options = {
            cwd: repoDir
        };
        var git = cp.spawn('git', ['checkout', 'tags/' + tag], options);

        git.on('exit', function(code) {
            if (code) {
                return callback(M.error(M.error.API_REPO_GIT_OPERATION_FAILED, 'checkout (tag)', 'exit code ' + code));
            }
            callback(null);
        });
    });
}


exports.cloneToDir = cloneToDir;
exports.checkoutTag = checkoutTag;
exports.getJsonFromRepo = getJsonFromRepo;
exports.validateUrl = validateUrl;

