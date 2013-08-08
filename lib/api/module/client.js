var fs = require('fs');
var zlib = require('zlib');
var UglifyJS = require('uglify-js');

var DEV_MODULE_REGEX = new RegExp('^' + M.config.MODULE_DEV_TAG + '_');

function wrapScript(module, scriptPath, callback) {

    var version = DEV_MODULE_REGEX.test(module.version) ? 'dev' : module.version;
    var clientPath = module.getModulePath() + '/' + version + scriptPath;
    var relPath = module.getVersionPath() + scriptPath;
    var absPath = M.config.MODULE_ROOT + relPath;

    fs.readFile(absPath, function(err, data) {

        if (err) { return callback(err); }
        
        var content = data.toString();
        if (content.indexOf('M.wrap') === -1) {
            content = 'M.wrap(\'' + clientPath + '\', function (require, module, exports) {\n' +
            content + '\nreturn module; });';
        }

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
