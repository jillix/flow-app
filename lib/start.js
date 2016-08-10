const spawn = require('child_process').spawn;
const strarg_regex = /'/g;
const strarg_replace = "\\'";

+// TODO start a container?
+// - project mics as volume
+// - installed npm modules as volume
+// - entrypoint as param or file?
+// - restart on mic change
+// - restart on entrypoint change (config.json)
+// - where to write logs?
 
+module.exports = function (entrypoint, command) {
+console.log('Flow-app.start: COMMAND:', command);
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
