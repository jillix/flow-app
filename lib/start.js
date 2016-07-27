const spawn = require('child_process').spawn;

module.exports = function (entrypoint, infrastructure) {

    // replace command arguments
    infrastructure.command = infrastructure.command.replace('$EVENT', entrypoint.event);
    infrastructure.command = infrastructure.command.replace('$NETWORK', infrastructure.network);

    let envString = JSON.stringify(entrypoint.env);
    envString = envString.replace(/'/g, "\\'");
    envString = "'" + envString + "'";
    infrastructure.command = infrastructure.command.replace('$ENVIRONMENT', envString);

    // spawn detached process
    // TODO logs, errors? 
    const child = spawn(infrastructure.command, [], {
        detached: true,
        stdio: ['ignore', process.stdout, process.stderr],
        shell: true
    });

    child.unref();
};
