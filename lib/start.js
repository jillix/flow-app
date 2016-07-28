const spawn = require('child_process').spawn;
const strarg_regex = /'/g;
const strarg_replace = "\\'";

module.exports = function (entrypoint, infrastructure) {

    // spawn detached process
    // TODO logs, errors? 
    const child = spawn(infrastructure.command, [], {
        detached: true,
        stdio: ['ipc', process.stdout, process.stderr],
        shell: true
    });

    child.send(entrypoint);
};
