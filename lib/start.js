const spawn = require('child_process').spawn;
const strarg_regex = /'/g;
const strarg_replace = "\\'";
const command = '/home/adioo/repos/flow-nodejs/index.js';

module.exports = function (entrypoint, infrastructure) {

    // spawn detached process
    // TODO logs, errors? 
    // TODO restart on mic change
    const child = spawn(command, [], {
        detached: true,
        stdio: ['ipc', process.stdout, process.stderr],
        shell: true
    });

    child.send(entrypoint);
};

exports.restart = function (entrypoint, infrastructure) {

};
