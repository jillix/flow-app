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
            data.toString() +
            '\nreturn module; });';
        
        if (M.config.compressFiles) {
            
            zlib.gzip(UglifyJS.minify(content, {fromString: true}).code, function (err, content) {
                
                fs.writeFile(absPath, content, callback);
            });
            
        } else {
            fs.writeFile(absPath, content, callback);
        }
    });
}

function minify (path, rename, callback) {
    
    callback = callback || (typeof rename === 'function' ? rename : function () {});
    
    fs.readFile(path, 'utf8', function(err, data) {

        if (err) { return callback(err); }
            
        zlib.gzip(UglifyJS.minify(data, {fromString: true}).code, function (err, data) {
            
            if (rename === true) {
                path = path.split('.')[0] + '.min.gz';
            }
            
            fs.writeFile(path, data, callback);
        });
    });
}

exports.wrapScript = wrapScript;
exports.minify = minify;
