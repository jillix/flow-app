/*///////////////////////////// OLD MONO API

M.session.startSession
M.session.endSessions
M.session.endSession
M.session.endAllUserSessions
M.session.updateSession
M.session.getSession

M.orient.connect
M.orient.disconnect

M.app.readDescriptor
M.app.install
M.app.uninstall
M.app.getApplication
M.app.getApplications
M.app.getApplicationDomains
M.app.isApplicationRunning

M.module.fetchModule
M.module.removeModule
M.module.installModule
M.module.uninstallModule
M.module.installLocalModule
M.module.Module
     
M.repo.getModules
M.repo.getVersions

M.dir.copyDirectory
M.dir.makeDirectory
M.dir.removeDirectory

M.user.addUser
M.user.User

M.model.getModuleVersion
M.model.getModuleVersionDependencies
M.model.addModuleVersionDependency
M.model.getModuleVersionId
M.model.upsertModule
M.model.upsertModuleVersion
M.model.deleteModuleVersion
M.model.addModuleInstance
M.model.getModuleConfig
M.model.getModuleFile
M.model.insertOperations
M.model.addCanPerform
M.model.addApplication
M.model.deleteApplication
M.model.getApplications
M.model.getApplication
M.model.getAppId
M.model.getApplicationDomains
M.model.deleteApplicationDomains
M.model.addApplicationDomains
M.model.addApplicationPort
M.model.getDomainApplication
M.model.getUser
M.model.assignRole
M.model.updatePublicUser 
M.model.addRole
M.model.addUser
M.model.deleteUsers
M.model.deleteRoles
M.model.getUserOperation
M.model.getDomainPublicUser

M.installation.installApps
M.installation.installApp
M.installation.installModule
M.installation.reinstallApp
M.installation.uninstallApp
M.installation.uninstallModule
M.installation.updateApp

M.util.uid
M.util.load
M.util.read
M.util.ip
M.util.merge
*/

M = {config: require('./lib/config')};
M.orient = require('./lib/api/db/orient');
M.mongo = require('./lib/api/db/mongo');
M.util = require('./lib/api/util');

M.app = require('./lib/api/app');
M.operation = require('./lib/api/operation');
M.module = require('./lib/api/module');
M.session = require('./lib/api/session');

// test data for error configs
/*if (M.config.app) {
M.config.app.errors = {
    "*": {
        "html": 'html/error/404.html',
        "css": ['css/error.css'],
        "scripts": ['error.js']
    }
};
}*/


/*M.repo = require('./lib/_api/repos');
M.dir = require('./lib/_api/directory');
M.model = require('./lib/_api/model');
M.installation = require('./lib/_api/installation');*/

module.exports = M;
