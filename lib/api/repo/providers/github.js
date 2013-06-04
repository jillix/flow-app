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

/*
 *  Authenticate the user on Github
 *  - basic
 *  {  
 *      type:     "basic",
 *      username: "...",
 *      password: "..."
 *  }
 *
 *  - oauth
 *  {
 *      type: "oauth",
 *      token: "..." (access_token is also accepted)
 *  }
 */
function authenticate (auth) {
   
    var GHApi = "Github API: ";

    if (!auth.type) { return console.log(GHApi + "Missing type key in auth object ('basic' or 'oauth')."); }
    if (auth.type === "basic" && (!auth.username || !auth.password)) { return console.log(GHApi + "Missing 'username' or 'password' keys in the auth object."); } 
    if (auth.type === "oauth" && !auth.token && !auth.access_token) { return console.log(GHApi + "Missing 'token' in the auth object."); }
    if (["basic", "oauth"].indexOf(auth.type) === -1 ) { return console.log(GHApi + "Invalid auth type: " + auth.type); }
   
    auth.token = auth.token || auth.access_token;

    gh.authenticate(auth);
}

function getContent (data, callback) {

    getRepo(data, function (err, repo) {

        if (err) { return callback(err); }

        if (data.auth) {
            authenticate(data.auth);
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
        authenticate(data.auth);
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
        authenticate(data.auth);
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
   
    data.per_page = 100;
    data.auth.type = "oauth";

    if (data.auth) {
        authenticate(data.auth);
        delete data.auth;
    }

    gh.repos.getAll(data, function (err, userRepos) {

        if (err) { return callback(err); }

        // TODO Validate with RegExp:
        //      ^(all|owner|member)$
        if (data.type.indexOf("member") !== -1 || data.type.indexOf("all") !== -1) {

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

// TODO Return a boolean value
//      It's duplicate of getContent
function hasFile(data, callback) {
    
    data.auth.type = "oauth";

    if (data.auth) {
        authenticate(data.auth);
        // delete data.auth;
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
exports.authenticate = authenticate;
