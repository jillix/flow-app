// load mono api
require(process.cwd() + '/api');

function exit(err) {

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

var MONO_DEV_GIT_URL = 'git@github.com:jillix/MonoDev.git';

M.app.fetch(MONO_DEV_GIT_URL, function(err, descriptor) {

    if (err) { return exit(err); }

    M.app.install(descriptor, function(err) {

        if (!err) {
            console.log('Successfully installed ' + descriptor.appid + ' (' + descriptor.name + ') from: ' + MONO_DEV_GIT_URL);
        }

        exit(err);
    });
});

