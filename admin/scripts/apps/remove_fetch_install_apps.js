// ****************************************************************************
// This scripts removed and redeploys a known application.
// Provide as arguments one or more repo names or app 2 letter acronyms.

// Usage example:
//      node remove_fetch_install_apps.js [options] monodev Ladivina sG Pl')
// ****************************************************************************

// setup will:
// - process the arguments
// - load M APIs
// - make sure ONLY one deployment execution runs at one time
var setup = require('./lib/setup').deployment_script();


function installAppsSequential(index) {

    if (!setup.apps[index]) {
        setup.exit();
        return;
    }

    var APP_DESC = setup.apps[index].id + ' - ' + setup.apps[index].repo;
    console.log('Installing: ' + APP_DESC);

    if (setup.argv.v) {
        console.log('>>> Trying to remove all traces of this application (' + APP_DESC + ')');
    }
    M.app.remove(setup.apps[index].id, function (err, data) {

        // do not stop on error because the app caould have been missing

        if (setup.argv.v) {
            console.log('>>> Fething this application (' + APP_DESC + ')');
        }
        M.app.fetch(setup.apps[index].repo, function(err, descriptor) {

            if (err) {
                console.error('>>> Failed to fetch this application (' + APP_DESC + ')');
                installAppsSequential(++index);
                return;
            }

            if (setup.argv.v) {
                console.log('>>> Installing this application (' + APP_DESC + ')');
            }
            M.app.install(descriptor, function(err) {

                if (err) {
                    console.error('>>> Failed to install this application (' + APP_DESC + ')');
                    installAppsSequential(++index);
                    return;
                }

                if (setup.argv.v) {
                    console.log('>>> Successfully installed (' + APP_DESC + ') ' + descriptor.name);
                }
                installAppsSequential(++index);
            });
        });

    });
}

installAppsSequential(0);

