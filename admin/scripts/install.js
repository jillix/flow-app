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

var MONO_DEV_GIT_URL = 'git@github.com:jillix/MonoDev.git';

M.app.fetch(MONO_DEV_GIT_URL, function(err, descriptor) {

    if (err) { return exit(err); }

    M.app.install(descriptor, function(err) {

        if (err) { return exit(err); }

        console.log('Successfully installed MonoDev from: ' + MONO_DEV_GIT_URL);

        //M.app.uninstall(MONO_DEV_DESCRIPTOR_PATH, function(err) {

        //    if (!err) {
        //        console.log('Successfully uninstalled MonoDev (' + MONO_DEV_APP_ID + ')');
        //    }

            exit(err);
        //});
    });
});
