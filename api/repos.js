var fs = require("fs"),
    request = require("request");

var GitHubApi = require("github"),
    github = new GitHubApi({ version: "3.0.0" });


function getModules(source, owner, callback) {

    if (source === "bitbucket") {
        return callback("Bitbucket is currently not supported. Please try again later or bug Gabriel!");
    }

    var data = {
        user: owner,
        type: "owner"
    };

    github.repos.getFromUser(data, function(err, res) {

        if (err) {
            return callback(err.message || err);
        }

        var modules = [];
        var count = res.length;

        if (!count) {
            return callback(null, []);
        }

        for (var i = 0; i < count; i++) {
            (function (repo) {
                request.head("https://raw.github.com/" + data.user + "/" + res[i].name + "/master/mono.json", function(err, response) {
                    if (!err && response.statusCode == 200) {
                        modules.push(repo);
                    }
                    count--;
                    if (!count) {
                        callback(null, modules)
                    }
                }); 
            })(res[i]);
        }
    });
}


function getVersions(source, owner, module, callback) {

    var data = {
        source: source,
        user: owner,
        repo: module
    };

    github.repos.getTags(data, function(err, res) {
        if (err) {
            send.internalservererror(link, err.message);
            return;
        }

        var versions = [];

        for (var i = 0; i < res.length; i++) {

            var rawUrl = res[i].commit.url;
            var url = rawUrl.replace("api.github.com/repos", "github.com").replace("/" + owner + "/" + module + "/commits/", "/" + owner + "/" + module + "/tree/")

            var version = {
                name: res[i].name,
                url: url,
                zipurl: res[i].zipball_url,
                local: false
            }

            if (fs.existsSync(CONFIG.root + "/modules/" + source + "/" + owner + "/" + module + "/" + res[i].name)) {
                version.local = true;
            }

            versions.push(version);
        }

        callback(null, versions);

//        // TODO if versions must be individually checked for existing mono.json file
//        //      but this will screw the version order :(
//
//        var count = res.length;
//        if (!count) {
//            return callback(null, []);
//        }
//
//        var versions = [];
//
//        for (var i = 0; i < res.length; i++) {
//            (function (commit) {
//                var sourcePath = data.user + "/" + module + "/" + commit.sha;
//                request.head("https://raw.github.com/" + sourcePath + "/mono.json", function(err, response) {
//                    if (!err && response.statusCode == 200) {
//                        versions.push(commit);
//                        if (fs.existsSync(CONFIG.root + "/modules/" + source + "/" + sourcePath)) {
//                            commit.local = true;
//                        }
//                    }
//                    count--;
//                    if (!count) {
//                        callback(null, versions);
//                    }
//                }); 
//            })(res[i]);
//        }
    });
}


exports.getModules = getModules;
exports.getVersions = getVersions;

