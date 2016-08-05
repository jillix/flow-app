var exec = require('child_process').exec

module.exports = function (git_url, install_dir) {

    // TODO install git repo or pull
    // TODO read config to get compositions
    // TODO get all module paths
    // TODO install all modules

    console.log(script);
    exec(script, (err, stdout, stderr) => {
        if (err) {
            throw err;
        }
    })
};
