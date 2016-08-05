const spawn = require('child_process').spawn;
const strarg_regex = /'/g;
const strarg_replace = "\\'";

module.exports = function (entrypoint, command) {

    // spawn detached process
    // TODO logs, errors? 
    // TODO restart on mic change
    // TODO save child procs for stop
    const child = spawn(command, [], {
        detached: true,
        stdio: ['ipc', process.stdout, process.stderr],
        shell: true
    });

    child.send(entrypoint);
};

// TODO expose to cli
exports.restart = function (entrypoint, infrastructure) {

};
