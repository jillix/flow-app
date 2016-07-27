const spawn = require('child_process').spawn;

module.exports = function (entrypoint) {

    // replace command arguments
    entrypoint.command = entrypoint.command.replace('$EVENT', entrypoint.event);
    entrypoint.command = entrypoint.command.replace('$NETWORK', entrypoint.network);

    let envString = JSON.stringify(entrypoint.env);
    envString = envString.replace(/'/g, "\\'");
    envString = "'" + envString + "'";
    entrypoint.command = entrypoint.command.replace('$ENVIRONMENT', envString);

    // spawn detached process
    // TODO logs, errors? 
    const child = spawn(entrypoint.command, [], {
        detached: true,
        stdio: ['ignore', process.stdout, process.stderr],
        shell: true
    });

    child.unref();
};
