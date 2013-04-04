
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


error.API_APP_INVALID_DESCRIPTOR = 'API_APP_INVALID_DESCRIPTOR';
messages.API_APP_INVALID_DESCRIPTOR = 'Invalid application descriptor file: $1';
error.API_APP_INVALID_DESCRIPTOR_ARGUMENT = 'API_APP_INVALID_DESCRIPTOR_ARGUMENT';
messages.API_APP_INVALID_DESCRIPTOR_ARGUMENT = 'The descriptor must be either a path to a descriptor file or a descriptor object.';
error.API_APP_FAILED_ADD = 'API_APP_FAILED_ADD';
messages.API_APP_FAILED_ADD = 'Failed to add new application with id $1. Error: $2';

error.API_REPO_INVALID_URL = 'API_REPO_INVALID_URL';
messages.API_REPO_INVALID_URL = 'Invalid or unsupported repository URL: $1';

error.API_REPO_CLONE_DESTINATION_ALREADY_EXISTS = 'API_REPO_CLONE_DESTINATION_ALREADY_EXISTS';
messages.API_REPO_CLONE_DESTINATION_ALREADY_EXISTS = 'The clone destination already exists: $1';

error.API_REPO_GIT_OPERATION_FAILED = 'API_REPO_GIT_OPERATION_FAILED';
messages.API_REPO_GIT_OPERATION_FAILED = '$1 Git operation failed: $2';

error.API_REPO_NOT_GIT = 'API_REPO_NOT_GIT';
messages.API_REPO_NOT_GIT = 'The path is not a valid Git repository: $1';

error.API_REPO_UNSUPPORTED_PROVIDER = 'API_REPO_UNSUPPORTED_PROVIDER';
messages.API_REPO_UNSUPPORTED_PROVIDER = 'Unsupported repository provider: $1';

error.API_REPO_PROVIDER_METHOD_NOT_IMPLEMENTED = 'API_REPO_PROVIDER_METHOD_NOT_IMPLEMENTED';
messages.API_REPO_PROVIDER_METHOD_NOT_IMPLEMENTED = 'Method not implemented for provider $1: $2';

error.API_REPO_UNAUTHORIZED = 'API_REPO_UNAUTHORIZED';
messages.API_REPO_UNAUTHORIZED = 'Unauthorized access to Git repository for provider $1: $2/$3';

error.API_REPO_NOT_FOUND = 'API_REPO_NOT_FOUND';
messages.API_REPO_NOT_FOUND = 'Repository not found for provider $1: $2/$3';

error.API_REPO_PATH_NOT_FOUND = 'API_REPO_PATH_NOT_FOUND';
messages.API_REPO_PATH_NOT_FOUND = 'Path not found in repository $1/$2/$3: $4';

error.API_REPO_INVALID_API_REQUEST = 'API_REPO_INVALID_API_REQUEST';
messages.API_REPO_INVALID_API_REQUEST = 'Invalid Git API request for provider $1: $2. Error: $3';

error.API_JSON_PARSE = 'API_JSON_PARSE';
messages.API_JSON_PARSE = 'Error while parsing JSON: $1';

error.IO_ERROR = 'IO_ERROR';
messages.IO_ERROR = 'I/O error: $1';


module.exports = error;

