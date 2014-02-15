exports.deployment_script = function() {

    var known_apps = require('./known_apps');

    // optimist for parameter parsing
    var argv = require('optimist')
        .usage('Usage: $0 [options] monodev Ladivina sG Pl')
        .boolean(['la', 'lm', 'v'])
        .describe('lm', 'flag to print module installation log')
        .describe('la', 'flag to print application installation log')
        .describe('v', 'Print installation progress')
        .argv;

    // process the apps argument
    var apps = processApps(argv['_']);
    if (!apps || !apps.length) {
        console.error('No applications found to redeploy');
        console.error('Did you try one or more of: ladivina, monodev, partnerlogin, cctool, etc. or one of the short names: ld, pl, sg, md, etc.');
        process.exit(1);
    }

    var locks = require('./locks');

    // early block deployments when they are already locked
    if (argv.v) {
        console.log('>>> Checking if deployment allowed...');
    }
    if (!locks.canDeploy()) {
        console.error('Deployments locked. Please try again later!');
        process.exit(2);
    }
    if (argv.v) {
        console.log('>>> Deployment allowed and locked by me');
    }

    // load mono api
    require(process.cwd() + '/api');
    M.config.log.applicationInstallation = argv.la;
    M.config.log.moduleInstallation = argv.lm;

    function processApps(appArgs) {

        if (!appArgs || !appArgs.length) {
            return [];
        }

        var result = [];

        for (var i in appArgs) {
            var app = appArgs[i];
            // simple name (must pe a code)
            if (app.indexOf('/') === -1) {
                app = known_apps.find(app);
                if (app) {
                    result.push(app);
                }
            } else {
                // TODO other parameter formats
            }
        }

        return result;
    }

    function exit(err) {

        if (err) {
            console.error(err);
        }

        if (!locks.releaseDeploy()) {
            console.error('>>> Failed to release deploy lock');
        }

        // the install opens an orient connection so we have to close it when done
        // TODO if the DB was not opened this call will throw an error
        M.orient.close();

        if (err) {
            process.exit(1);
        }

        process.exit(0);
    }

    return {
        argv: argv,
        exit: exit,
        apps: apps
    }
}
