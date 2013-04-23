var fs = require('fs');

function wrapScript(module, scriptPath, callback) {

    var relPath = module.getVersionPath() + scriptPath;
    var absPath = M.config.MODULE_ROOT + relPath;

    fs.readFile(absPath, function(err, data) {

        if (err) { return callback(err); }

        var content =
            'M.wrap(\'' + relPath + '\', function(require, module, exports) {' +
            '\n' +
            data.toString() +
            '\n' +
            'return module; });';

        fs.writeFile(absPath, content, callback);
    });
}


exports.wrapScript = wrapScript;

