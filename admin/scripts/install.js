// load mono api
require(process.cwd() + '/api');

M.app.install(process.cwd() + '/apps/00000000000000000000000000000002/mono.json', function() {
    M.orient.close();
});
