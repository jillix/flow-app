var fs = require('fs');
var cp = require('child_process');

var Github = require('github');
var gh = new Github({ version: '3.0.0' });

/**
 * Tries to get the content of a JSON file from a repository.
 */
function getJsonFromRepo(url, path, callback) {

    var data = getUserAndRepoFromUrl(url);
    // TODO implement getUserAndRepoFromUrl
    data = {
        user: 'jillix',
        repo: 'MonoDev'
    };

    data.path = path;

    // TODO add authentication
    var credentials = {
        type: 'basic',
        username: 'your_username',
        password: 'your_password'
    };
    gh.authenticate(credentials);

    // TODO delete when authentication is implemented
    if (credentials.username === 'your_username') {
        var message = 'Provide your credentials in: ' + __dirname + '/repo.js';
        console.error(message);
        return callback(message);
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

function getUserAndRepoFromUrl (url) {

    // TODO validate the url
    // TODO extract the user and the repo name and return an object like:
    //      { user: ..., repo: ... }
}

/**
 * Clones a git repo to a certain directory. The directory must exist
 */
function cloneToDir (url, dirName, baseName, callback) {

    fs.exists(dirName + '/' + baseName, function(exists) {

        if (exists) {
            return callback({ error: 'Path already exists: ' + dirName + '/' + baseName, code: 201 });
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
                return callback({ error: 'Git error: git clone exited with code ' + code, code: 200 });
            }

            callback(null);
        });
    });
}

function checkoutTag(repoDir, tag, callback) {

    fs.exists(repoDir + '/.git', function(exists) {

        if (!exists) {
            return callback({ error: 'Path is not a git repository: ' + repoDir, code: 202 });
        }

        var options = {
            cwd: repoDir
        };
        var git = cp.spawn('git', ['checkout', 'tags/' + tag], options);

        git.on('exit', function(code) {
            if (code) {
                return callback({ error: 'Git error: git checkout (tag) exited with code ' + code, code: 208 });
            }
            callback(null);
        });
    });
}


exports.cloneToDir = cloneToDir;
exports.checkoutTag = checkoutTag;
exports.getJsonFromRepo = getJsonFromRepo;

