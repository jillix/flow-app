var fs = require('fs');
var cp = require('child_process');
var providers = require('./repo/providers');
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
 *
 *  data structure:
 *  {
 *      auth:          ...
 *      path:          ...
 *      repo:          ...
 *      user:          ...
 *  }
 */
function getJsonFromRepo (source, data, callback) {

    // there must be a provider for the project source
    if (!providers[source]) {
        return callback(M.error(M.error.API_REPO_UNSUPPORTED_PROVIDER, source), data);
    }

    var repro = providers[source];
    var funct = 'getContent';

    // check if this provider implements the needed method
    if (typeof repro[funct] !== 'function') {
        return callback(M.error(M.error.API_REPO_PROVIDER_METHOD_NOT_IMPLEMENTED, source, funct), data);
    }

    // call the function on this provider
    repro[funct](data, function(err, fileContent) {

        if (err) { return callback(err, data); }

        var json;

        var e;
        try {
            var json = JSON.parse(fileContent);
        } catch (ex) { e = ex; }

        if (json) {
            callback(null, data, json);
        } else {
            callback(M.error(M.error.JSON_PARSE,  "", e.message), data);
        }
    });
}

/**
 * Get the Git origin URL of the repository clone at path.
 *
 * For security reasons, the path must be the top-level of a git repository.
 */
function getOriginUrl (path, callback) {

    var url = '';

    var options = {
        env: { 'GIT_DIR': path + '/.git' }
    };
    var git = cp.spawn('git', ['config', '--get', 'remote.origin.url'], options);

    git.stdout.on('data', function(data) {
        url += data.toString();
    });

    git.on('close', function(code, signal) {

        if (code) {
            return callback(M.error(M.error.API_REPO_NOT_GIT, path));
        }

        url = url.split('\n')[0];
        callback(null, url);
    });
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
function cloneToDir (url, dirName, baseName, options, callback) {

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    if (!M.repo.validateUrl(url)) {
        return callback(M.error(M.error.API_REPO_INVALID_URL, url));
    }

    var son = extractSonFromRepoFromUrl(url);

    fs.exists(dirName + '/' + baseName, function(exists) {

        if (exists) {
            return callback(M.error(M.error.API_REPO_CLONE_DESTINATION_ALREADY_EXISTS, dirName + '/' + baseName));
        }

        // process the options
        var params = ['clone', url, baseName];
        if (options.depth) {
            params.push('--depth');
            params.push(options.depth);
        }

        // execute the git command
        var opts = {
            cwd: dirName
        };

        var git = cp.spawn('git', params, opts);

        var error = '';
        git.stderr.on('data', function(data) {
            error += data.toString();
        });

        git.on('exit', function(code) {

            if (code) {
                if (error.match(/Repository not found/)) {
                    return callback(M.error(M.error.API_REPO_NOT_FOUND_FOR_URL, url));
                }
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

        var error = '';
        git.stderr.on('data', function(data) {
            error += data.toString();
        });

        git.on('exit', function(code) {

            if (code) {
                if (error.match(/did not match any file/)) {
                    return callback(M.error(M.error.API_REPO_TAG_NOT_FOUND, repoDir, tag));
                }
                return callback(M.error(M.error.API_REPO_GIT_OPERATION_FAILED, 'checkout (tag)', 'exit code ' + code));
            }
            callback(null);
        });
    });
}

/**
 * Return the commit ID of the HEAD of the current branch for the
 * repository at the given path.
 */
function getLocalHeadCommit (path, callback) {

    var commit = '';

    var options = {
        env: { 'GIT_DIR': path + '/.git' }
    };
    var git = cp.spawn('git', ['rev-parse', 'HEAD'], options);
    git.stdout.on('data', function(data) {
        commit += data.toString();
    });

    git.on('exit', function(code) {

        if (code) {
            return callback(M.error(M.error.API_REPO_GIT_OPERATION_FAILED, 'rev-parse HEAD', 'exit code ' + code));
        }

        commit = commit.split('\n')[0];

        callback(null, commit);
    });
}

/**
 * Return the commit ID of the HEAD of the origin's master branch for the
 * repository at the given path.
 */
function getRemoteHeadCommit (path, callback) {

    getOriginUrl(path, function(err, url) {

        if (err) { return callback(err); }

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
            repo: son.name
        };

        var repro = providers[son.source];
        var funct = 'getHeadCommit';

        // check if this provider implements the needed method
        if (typeof repro[funct] !== 'function') {
            return callback(M.error(M.error.API_REPO_PROVIDER_METHOD_NOT_IMPLEMENTED, son.source, funct));
        }

        // TODO adjust this functionality when authentication is implemented
        var auth = M.config.credentials[son.source];
        if (auth) {
            data.auth = auth;
        }

        // call the function on this provider
        repro[funct](data, callback);
    });
}

function getUserRepos(source, user, data, callback) {

    var repro = providers[source];

    if (!repro) {
        callback("Invalid source: " + source);
        return;
    }

    var funct = "getUserRepos";

    repro[funct](user, data, callback);
}

// TODO Return a boolean value
//      It's duplicate of getContent
function hasFile(source, data, callback) {

    var repro = providers[source];

    if (!repro) {
        callback("Invalid source: " + source, data);
        return;
    }

    var funct = "hasFile";

    repro[funct](data, callback);
}

exports.cloneToDir = cloneToDir;
exports.checkoutTag = checkoutTag;
exports.getJsonFromRepo = getJsonFromRepo;
exports.validateUrl = validateUrl;
exports.getOriginUrl = getOriginUrl;
exports.getLocalHeadCommit = getLocalHeadCommit;
exports.getRemoteHeadCommit = getRemoteHeadCommit;
exports.getUserRepos = getUserRepos;
exports.hasFile = hasFile;
exports.extractSonFromRepoFromUrl = extractSonFromRepoFromUrl;
