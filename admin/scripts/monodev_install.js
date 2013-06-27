// load mono api
require(process.cwd() + '/api');

function exit(err) {

    if (err) {
        console.error(err);
    }

    if (err) {
        process.exit(1);
    }
}

var MONO_DEV_GIT_URL = 'git@github.com:jillix/MonoDev.git';

M.app.fetch(MONO_DEV_GIT_URL, function(err, descriptor) {

    if (err) { return exit(err); }

    M.app.install(descriptor, function(err) {

        if (!err) {
            console.log('Successfully installed ' + descriptor.appId + ' (' + descriptor.name + ') from: ' + MONO_DEV_GIT_URL);
        }

        exit(err);
    });
});

