
function error(code) {

    if (!error[code]) {
        return new Error('Invalid error code: ' + code);
    }

    var message = error[code];

    for (var i = 1; i < arguments.length; ++i) {
        message.replace(new RegExp('\\$' + i, 'g'), arguments[i])
    }

    var e = new Error(message);
    e.code = code;
    return e;
}

error.APP_NOT_FOUND = 'No application found for host: $1';
error.MULTIPLE_APPS_FOUND = 'Multiple applications found for host: $1';
error.APP_DIR_NOT_FOUND = 'Application directory not found: $1';
error.APP_PORT_NOT_FOUND = 'No port found for running application: $1';
error.APP_NO_FREE_PORT = 'No free port found for application: $1';

module.exports = error;

