var fs = require('fs');
var zlib = require('zlib');
var UglifyJS = require('uglify-js');

function wrapScript(module, scriptPath, callback) {

    var relPath = module.getVersionPath() + scriptPath;
    var absPath = M.config.MODULE_ROOT + relPath;

    fs.readFile(absPath, function(err, data) {

        if (err) { return callback(err); }

        var content =
            'M.wrap(\'' + relPath + '\', function (require, module, exports) {\n' +
            data.toString() + '\n' +
            'return module; });';
        
        if (M.config.compressFiles) {
            
            zlib.gzip(UglifyJS.minify(content, {fromString: true}).code, function (err, content) {
                
                fs.writeFile(absPath, content, callback);
            });
            
        } else {
            fs.writeFile(absPath, content, callback);
        }
    });
}

exports.wrapScript = wrapScript;
