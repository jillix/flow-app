
function error(code) {

    if (!messages[code]) {
        return new Error('Invalid error code: ' + code);
    }

    var message = messages[code];

    for (var i = 1; i < arguments.length; ++i) {
        message = message.replace(new RegExp('\\$' + i, 'g'), arguments[i])
    }

    var e = new Error(message);
    e.code = code;
    return e;
}

var messages = {};

error.APP_NOT_FOUND = 'APP_NOT_FOUND';
messages.APP_NOT_FOUND = 'No application found for host: $1';

error.MULTIPLE_APPS_FOUND = 'MULTIPLE_APPS_FOUND';
messages.MULTIPLE_APPS_FOUND = 'Multiple applications found for host: $1';

error.APP_DIR_NOT_FOUND = 'APP_DIR_NOT_FOUND';
messages.APP_DIR_NOT_FOUND = 'Application directory not found: $1';

error.APP_PORT_NOT_FOUND = 'APP_PORT_NOT_FOUND';
messages.APP_PORT_NOT_FOUND = 'No port found for running application: $1';

error.APP_NO_FREE_PORT = 'APP_NO_FREE_PORT';
messages.APP_NO_FREE_PORT = 'No free port found for application: $1';

error.APP_SPAWN_INVALID_RESPONSE = 'APP_SPAWN_INVALID_RESPONSE';
messages.APP_SPAWN_INVALID_RESPONSE = 'The app spawner should have started with the application id "$1" but responsed: $2';


error.APP_SOCKET_RELOAD_MESSAGE = 'APP_SOCKET_RELOAD_MESSAGE';
messages.APP_SOCKET_RELOAD_MESSAGE = 'Please reload';


module.exports = error;

