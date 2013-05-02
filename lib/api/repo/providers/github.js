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

function getHeadCommit (data, callback) {

    data.sha = data.branch || 'master';
    delete data.branch;
    data.page = 1;
    data.per_page = 1;

    if (data.auth) {
        gh.authenticate(data.auth);
        delete data.auth;
    }

    gh.repos.getCommits(data, function(err, commits) {

        if (err) {
            var error;

            // 404 needs a path not found API_REPO_ error
            if (err.code === 404) {
                error =  M.error(M.error.API_REPO_INVALID_API_REQUEST, 'github', 'getCommits', err.message);
            } else {
                error = createError(err.code, err.message, data);
            }

            return callback(error);
        }

        if (!commits.length || !commits[0].sha) {
            return callback(M.error(M.error.API_REPO_INVALID_API_REQUEST, 'github', 'getCommits', 'No commits returned'));
        }

        callback(null, commits[0].sha);
    });
}

/*
 *  Get user repositories
 *  It will return an array of objects with repositories.
 */
function getUserRepos(user, data, callback) {

    if (data.auth) {
        gh.authenticate(data.auth);
        delete data.auth;
    }

    gh.repos.getAll(data, function (err, userRepos) {

        if (err) { return callback(err); }

        // TODO Validate with RegExp:
        // ^(all|owner|public|private|member)$
        // The repos from organizations have to be taken, too
        if (data.type.indexOf("member") !== -1) {

            // Get orgs from user
            gh.orgs.getFromUser(data, function (err, orgs) {
                
                if (err) { return callback(err); }

                // A recursive function, 
                // supposing that the user isn't member 
                // in a lot of organizations

                // TODO Can this be replaced with a for-loop?
                getReposFromOrg(orgs[0]);
                var repos = userRepos;
                var i = 0;
            
                function getReposFromOrg(org) {
                    
                    if (!org) {
                        callback(null, repos); 
                        return;
                    }
                    
                    data.org = org.login;
                    
                    // Get repos from user X and org Y.
                    gh.repos.getFromOrg(data, function(err, reposFromOrg) {
                        
                        if (err && err.code !== 404) { return callback(err); }
                        repos = repos.concat(reposFromOrg);

                        getReposFromOrg(orgs[++i]);
                    });
                }
            });
            
            return;
        }

        callback(null, userRepos);
    });
}

/*
 *  Has file verifies if a file exists in repo
 *  { 
 *      auth
 *      user
 *      path
 *      repo
 *  }
 */
function hasFile(data, callback) {
    
    if (data.auth) {
        gh.authenticate(data.auth);
        delete data.auth;
    }
  
    if (!data.path || !data.repo || !data.user) {
        callback("Missing data");
        return;
    }

    gh.repos.getContent(data, function(err, fileData) {
        
        if (err) {
            callback(err, null, data);
            return;
        }

        var fileContent = new Buffer(fileData.content, 'base64').toString();

        callback(null, fileContent, data);
    });
}

exports.getContent = getContent;
exports.getRepo = getRepo;
exports.getHeadCommit = getHeadCommit;
exports.getUserRepos = getUserRepos;
exports.hasFile = hasFile;
