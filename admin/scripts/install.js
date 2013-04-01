// load mono api
require(process.cwd() + '/api');

function exit(err) {

    // the install opens an orient connection so we have to close it when done
    M.orient.close();

    if (err) {
        console.error(err);
        process.exit(1);
    }
}

var MONO_DEV_APP_ID = '00000000000000000000000000000002';
var MONO_DEV_DESCRIPTOR_PATH = M.config.APPLICATION_ROOT + MONO_DEV_APP_ID + '/mono.json';

M.app.install(MONO_DEV_DESCRIPTOR_PATH, function(err) {

    if (err) { return exit(err); }

    console.log('Successfully installed MonoDev (' + MONO_DEV_APP_ID + ')');

    //M.app.uninstall(MONO_DEV_DESCRIPTOR_PATH, function(err) {

    //    if (!err) {
    //        console.log('Successfully uninstalled MonoDev (' + MONO_DEV_APP_ID + ')');
    //    }

        exit(err);
    //});
});
