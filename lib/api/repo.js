var fs = require('fs');
var cp = require('child_process');

var providers = require('./repo/providers');

// ***************************************************************************
// TODO this is a temporary solution until we have authentication
var credentials;
try {
    credentials = require(M.config.root + '/tmp/credentials');
} catch (e) {
    var sampleCreds = {
        github: { type: 'basic', username: 'your_github_username', password: 'your_github_password' },
        bitbucket: { username: 'your_bitbucket_username', password: 'your_bitbucket_password' }
    };
    console.error(JSON.stringify(sampleCreds));
    console.error('Please provide your Git credentials in tmp/credentials.json as above.');
    process.exit(1);
}
// ***************************************************************************

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

    // TODO adjust this functionality when authentication is implemented
    var auth = credentials[son.source];
    if (auth) {
        data.auth = auth;
    }

    // call the function on this provider
    repro[funct](data, function(err, fileContent) {

        if (err) { return callback(err); }

        try {
            var json = JSON.parse(fileContent);
            return callback(null, json);
        } catch (e) {
            callback(M.error(M.error.JSON_PARSE, url + ' at ' + path, e.message));
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
            
            console.log('\nCloning ' + url + ' into ' + dirName + ' ...');
            
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
        var auth = credentials[son.source];
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
    }

    var funct = "getUserRepos";

    repro[funct](user, data, callback);
}

exports.cloneToDir = cloneToDir;
exports.checkoutTag = checkoutTag;
exports.getJsonFromRepo = getJsonFromRepo;
exports.validateUrl = validateUrl;
exports.getOriginUrl = getOriginUrl;
exports.getLocalHeadCommit = getLocalHeadCommit;
exports.getRemoteHeadCommit = getRemoteHeadCommit;
exports.getUserRepos = getUserRepos;
