/*

MONO API

installation/deployment
administration
databases
users

*/
M = {config: require('./lib/config')};
M.orient = require('./lib/api/orient');
M.app = require('./lib/api/apps');
M.module = require('./lib/api/modules');
M.repo = require('./lib/api/repos');
M.dir = require('./lib/api/directory');
M.user = require('./lib/api/users');
M.model = require('./lib/api/model');
M.session = require('./lib/api/sessions');
M.installation = require('./lib/api/installation');

module.exports = M;
