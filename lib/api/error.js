
function error(code) {

    if (!messages[code]) {
        return new Error('Invalid error code: ' + code);
    }

    var message = messages[code];
    for (var i = 1; i < arguments.length; ++i) {

        var value = arguments[i];

        // do not provide a function to replace since this will run it
        if (typeof arguments[i] === 'function') {
            value = '[function]';
        }

        message = message.replace(new RegExp('\\$' + i, 'g'), value);
    }

    var e = new Error(message);
    e.code = code;
    return e;
}

var messages = {};


// ***************************************************************************
// API errors
// ***************************************************************************

// API_APP errors
error.API_APP_NOT_FOUND = 'API_APP_NOT_FOUND';
messages.API_APP_NOT_FOUND = 'Application not found: $1';

error.API_APP_NOT_FOUND_FOR_DOMAIN = 'API_APP_NOT_FOUND_FOR_DOMAIN';
messages.API_APP_NOT_FOUND_FOR_DOMAIN = 'No application found for domain: $1';

error.API_APP_INVALID = 'API_APP_INVALID';
messages.API_APP_INVALID = 'Invalid application "$1": $2';

error.API_APP_INVALID_ID = 'API_APP_INVALID_ID';
messages.API_APP_INVALID_ID = 'Invalid application id: $1';

error.API_APP_INVALID_DESCRIPTOR = 'API_APP_INVALID_DESCRIPTOR';
messages.API_APP_INVALID_DESCRIPTOR = 'Invalid application descriptor file: $1';

error.API_APP_INVALID_DESCRIPTOR_ARGUMENT = 'API_APP_INVALID_DESCRIPTOR_ARGUMENT';
messages.API_APP_INVALID_DESCRIPTOR_ARGUMENT = 'The descriptor must be either a path to a descriptor file or a descriptor object.';

error.API_APP_FAILED_ADD = 'API_APP_FAILED_ADD';
messages.API_APP_FAILED_ADD = 'Failed to add new application with id $1. Error: $2';

error.API_APP_ROLE_NOT_FOUND = 'API_APP_ROLE_NOT_FOUND';
messages.API_APP_ROLE_NOT_FOUND = 'Role "$1" not found for application: $2';

// API_REPO errors

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

error.API_REPO_BRANCH_NOT_FOUND = 'API_REPO_BRANCH_NOT_FOUND';
messages.API_REPO_BRANCH_NOT_FOUND = 'Branch not found in repository $1/$2/$3: $4';

error.API_REPO_INVALID_COMMIT_ID = 'API_REPO_INVALID_COMMIT_ID';
messages.API_REPO_INVALID_COMMIT_ID = 'Invalid commit ID for repository $1/$2/$3: $4';

error.API_REPO_INVALID_API_REQUEST = 'API_REPO_INVALID_API_REQUEST';
messages.API_REPO_INVALID_API_REQUEST = 'Invalid Git API request for provider $1: $2. Error: $3';

// API_DS errors

error.API_DS_INVALID_NAME = 'API_DS_INVALID_NAME';
messages.API_DS_INVALID_NAME = 'Invalid datasource name: $1';

error.API_DS_NOT_FOUND = 'API_DS_NOT_FOUND';
messages.API_DS_NOT_FOUND = 'Application "$1" has no such datasource: $2"';

// API_OPR errors

error.API_OPR_NOT_FOUND_PERMISSION = 'API_OPR_NOT_FOUND_PERMISSION';
messages.API_OPR_NOT_FOUND_PERMISSION = 'Operation "$1" not found for miid "$2" and role "$3"';

error.API_OPR_NOT_FOUND = 'API_OPR_NOT_FOUND';
messages.API_OPR_NOT_FOUND = 'Operation "$1" not found for module version "$2"';

// other API_... errors

error.API_JSON_PARSE = 'API_JSON_PARSE';
messages.API_JSON_PARSE = 'Error while parsing JSON: $1';


// ***************************************************************************
// DB errors
// ***************************************************************************

// DB_ORIENT errors

error.DB_ORIENT_SQL_COMMAND_ERROR = 'DB_ORIENT_SQL_COMMAND_ERROR';
messages.DB_ORIENT_SQL_COMMAND_ERROR = 'Error while executing SQL command: %1\nError: %2';

error.DB_ORIENT_NO_CLUSTER_FOR_CLASS = 'DB_ORIENT_NO_CLUSTER_FOR_CLASS';
messages.DB_ORIENT_NO_CLUSTER_FOR_CLASS = 'Could not find the cluster ID fir class: $1';

error.DB_ORIENT_OPERATION_NOT_UNIQUE = 'DB_ORIENT_OPERATION_NOT_UNIQUE';
messages.DB_ORIENT_OPERATION_NOT_UNIQUE = 'Could not uniquely determine operation with name: $1 (mvid: $2)';

error.DB_ORIENT_OPERATION_NOT_UNIQUE_PERMISSION = 'DB_ORIENT_OPERATION_NOT_UNIQUE_PERMISSION';
messages.DB_ORIENT_OPERATION_NOT_UNIQUE_PERMISSION = 'Could not uniquely determine operation with name: $1 (miid: $2, role: $3)';

error.DB_ORIENT_OPERATION_NOT_COMPLETE = 'DB_ORIENT_OPERATION_NOT_COMPLETE';
messages.DB_ORIENT_OPERATION_NOT_COMPLETE = 'The operation object is not complete: $1 (miid: $2, role: $3)';


// ***************************************************************************
// IO errors
// ***************************************************************************

error.IO_ERROR = 'IO_ERROR';
messages.IO_ERROR = 'I/O error: $1';

error.APP_SEND_JSON_STRINGIFY = 'APP_SEND_JSON_STRINGIFY';
messages.APP_SEND_JSON_STRINGIFY = 'Error while stringify an Object.';


// ***************************************************************************
// APP errors
// ***************************************************************************

error.APP_NOT_UNIQUE = 'APP_NOT_UNIQUE';
messages.APP_NOT_UNIQUE = 'Multiple applications found for: $1';

error.APP_DIR_NOT_FOUND = 'APP_DIR_NOT_FOUND';
messages.APP_DIR_NOT_FOUND = 'Application directory not found: $1';

error.APP_PORT_NOT_FOUND = 'APP_PORT_NOT_FOUND';
messages.APP_PORT_NOT_FOUND = 'No port found for running application: $1';

error.APP_NO_FREE_PORT = 'APP_NO_FREE_PORT';
messages.APP_NO_FREE_PORT = 'No free port found for application: $1';

error.APP_SPAWN_INVALID_RESPONSE = 'APP_SPAWN_INVALID_RESPONSE';
messages.APP_SPAWN_INVALID_RESPONSE = 'The app spawner should have started with the application id "$1" but answered: $2';

error.APP_SOCKET_RELOAD_MESSAGE = 'APP_SOCKET_RELOAD_MESSAGE';
messages.APP_SOCKET_RELOAD_MESSAGE = 'Please reload';



module.exports = error;

