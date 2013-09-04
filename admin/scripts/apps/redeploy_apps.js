// ****************************************************************************
// This scripts redeploys a known installed application.
// Provide as arguments one or more repo names or app 2 letter acronyms.

// Usage example:
//      node redeploy_apps.js [options] monodev Ladivina sG Pl')
// ****************************************************************************

// setup will:
// - process the arguments
// - load M APIs
// - make sure ONLY one deployment execution runs at one time
var setup = require('./lib/setup').deployment_script();


function redeployAppsSequential(index) {

    if (!setup.apps[index]) {
        setup.exit();
        return;
    }

    var APP_DESC = setup.apps[index].id + ' - ' + setup.apps[index].repo;
    console.log('Redeploying: ' + APP_DESC);

    if (setup.argv.v) {
        console.log('>>> Trying to redeploy this application (' + APP_DESC + ')');
    }
    M.app.redeploy(setup.apps[index].id, function (err, descriptor) {

        if (err) {
            console.error('>>> Failed to redeploy this application (' + APP_DESC + ')');
            redeployAppsSequential(++index);
            return;
        }

        if (setup.argv.v) {
            console.log('>>> Successfully redeployed (' + APP_DESC + ') ' + descriptor.name);
        }
        redeployAppsSequential(++index);
    });
}

redeployAppsSequential(0);

