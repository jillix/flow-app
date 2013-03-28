// load mono api
require(process.cwd() + '/api');

M.app.install(process.cwd() + '/apps/00000000000000000000000000000002/mono.json', function() {
    // the install opens an orient connection so we have to close it when done
    M.orient.close();
});
