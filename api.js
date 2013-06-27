
M = { config: require('./lib/config') };

M.error = require('./lib/api/error');
M.mongo = require('./lib/api/db/mongo');
M.util = require('./lib/api/util');
M.fs = require('./lib/api/fs');
M.repo = require('./lib/api/repo');

M.app = require('./lib/api/app');
M.module = require('./lib/api/module');

M.operation = require('./lib/api/operation');
M.session = require('./lib/api/session');
M.datasource = require('./lib/api/datasource');
M.database = require('./lib/api/database');

M.runtime = require('./lib/api/runtime');

module.exports = M;

