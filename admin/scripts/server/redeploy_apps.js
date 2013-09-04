var KNOWN_APPS = {
    // MonoDev
    '00000000000000000000000000000002': {
        alias: ['monodev', 'md'],
        repo: 'git@github.com:jillix/MonoDev.git'
    },
    // DMS apps
    'cc36hf78HGT965HgtB96KJyg9dfGHtgV': {
        alias: ['cctool', 'cc'],
        repo: 'git@bitbucket.org:jillix/cctool.git'
    },
    'dms30dksd36V0a5PRPzXHgE49J5HlfHF': {
        alias: ['dms'],
        repo: 'git@bitbucket.org:jillix/dms.git'
    },
    'not-known-yet': {
        alias: ['crm'],
        repo: 'git@bitbucket.org:jillix/crm.git'
    },
    // old apps
    '00000000000000000000000000000109': {
        alias: ['ladivina', 'ld'],
        repo: 'git@bitbucket.org:jillix/ladivina.git'
    },
    '00000000000000000000000000000100': {
        alias: ['partnerlogin', 'pl'],
        repo: 'git@bitbucket.org:jillix/partnerlogin.git'
    },
    '00000000000000000000000000000108': {
        alias: ['salongenf', 'sg'],
        repo: 'git@bitbucket.org:jillix/salongenf.git'
    },
    '00000000000000000000000000000101': {
        alias: ['aktionshop', 'as'],
        repo: 'git@bitbucket.org:jillix/aktionshop.git'
    },
    '00000000000000000000000000000051': {
        alias: ['liqshoporders', 'lo'],
        repo: 'git@bitbucket.org:jillix/liqshoporders.git'
    }
};

// optimist for parameter parsing
var argv = require('optimist')
    .usage('Usage: $0 [options] monodev Ladivina sG Pl')
    .boolean(['la', 'lm', 'v'])
    .describe('lm', 'flag to print module installation log')
    .describe('la', 'flag to print application installation log')
    .describe('v', 'Print installation progress')
    .argv;

var fs = require("fs");

// process the apps argument
var appsToInstall = processApps(argv['_']);
if (!appsToInstall || !appsToInstall.length) {
    console.error('No applications found to install');
    console.error('Did you try one or more of: ladivina, monodev, partnerlogin, cctool, etc. or one of the short names: ld, pl, sg, md, etc.');
    process.exit(1);
}

// load mono api
require(process.cwd() + '/api');
M.config.log.applicationInstallation = argv.la;
M.config.log.moduleInstallation = argv.lm;

function exit(err) {

    fs.unlink(PATH_TO_DUMMY_FILE, function (err) {
        if (err) {
            console.log("Error in deleting the dummy file.", err);
        }
        console.log("Successfully deleted dummy file.");
    });

    if (err) {
        console.error(err);
    }

    // the install opens an orient connection so we have to close it when done
    // TODO if the DB was not opened this call will throw an error
    M.orient.close();

    if (err) {
        process.exit(1);
    }
}

function findInKnownApps(app) {
    for (var i in KNOWN_APPS) {
        for (var a in KNOWN_APPS[i].alias) {
            if (KNOWN_APPS[i].alias[a] === app.toLowerCase()) {
                return { id: i, repo: KNOWN_APPS[i].repo };
            }
        }
    }
}

function processApps(appArgs) {

    if (!appArgs || !appArgs.length) {
        return [];
    }

    var apps = [];

    for (var i in appArgs) {
        var app = appArgs[i];
        // simple name (must pe a code)
        if (app.indexOf('/') === -1) {
            app = findInKnownApps(app);
            if (app) {
                apps.push(app);
            }
        } else {
            // TODO other parameter formats
        }
    }

    return apps;
}

function installAppsSequential(index) {

    if (!appsToInstall[index]) {
        exit();
        return;
    }

    var APP_DESC = appsToInstall[index].id + ' - ' + appsToInstall[index].repo;
    console.log('Installing: ' + APP_DESC);

    if (argv.v) {
        console.log('>>> Trying to remove all traces of this application (' + APP_DESC + ')');
    }
    M.app.remove(appsToInstall[index].id, function (err, data) {

        // do not stop on error because the app caould have been missing

        if (argv.v) {
            console.log('>>> Fething this application (' + APP_DESC + ')');
        }
        M.app.fetch(appsToInstall[index].repo, function(err, descriptor) {

            if (err) {
                console.error('>>> Failed to fetch this application (' + APP_DESC + ')');
                installAppsSequential(++index);
                return;
            }

            if (argv.v) {
                console.log('>>> Installing this application (' + APP_DESC + ')');
            }
            M.app.install(descriptor, function(err) {

                if (err) {
                    console.error('>>> Failed to install this application (' + APP_DESC + ')');
                    installAppsSequential(++index);
                    return;
                }

                if (argv.v) {
                    console.log('>>> Successfully installed (' + APP_DESC + ') ' + descriptor.name);
                }
                installAppsSequential(++index);
            });
        });

    });
}

// verify if other person hasn't already run this script
var PATH_TO_DUMMY_FILE = "./tmp/redeploy_apps_dummy.json";
try {
    var dummy = require(PATH_TO_DUMMY_FILE);
    // successfully read file, so script is already running
    console.log("Please try again later. Script is busy.");
    return;
} catch (e) {
    // script can be run, create dummy file to prevent it running again
    console.log("Creating dummy file to be sure that nobody will run this again.");
    fs.openSync(PATH_TO_DUMMY_FILE, "w");
    fs.writeFile(PATH_TO_DUMMY_FILE, "{}", function (err, data) {
        if (err) {
            exit("Error while writting the dummy file.", err);
            return;
        }

        console.log("Wrritten the dummy file.", PATH_TO_DUMMY_FILE);

        // start installing
        installAppsSequential(0);
    });
}
