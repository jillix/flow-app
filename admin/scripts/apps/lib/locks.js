var fs = require('fs');

var DEFAULT_LOCK_FILE_PATH_DEPLOY = __dirname + '/.lock_deploy';

exports.canDeploy = function (lockFile) {
    var result = !fs.existsSync(lockFile || DEFAULT_LOCK_FILE_PATH_DEPLOY);
    // if green to go, lock the deployment process
    if (result) {
        try {
            fs.writeFileSync(lockFile || DEFAULT_LOCK_FILE_PATH_DEPLOY, '');
        } catch (e) {
            return false;
        }
    }
    return result;
}

exports.releaseDeploy = function (lockFile) {

    // we have to report a status for error logging

    try {
        fs.unlinkSync(lockFile || DEFAULT_LOCK_FILE_PATH_DEPLOY);
    } catch (e) {
        console.error(e)
        return false;
    }

    return true;
}
