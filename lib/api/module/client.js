var fs = require('fs');
var zlib = require('zlib');
var UglifyJS = require('uglify-js');

var DEV_MODULE_REGEX = new RegExp('^' + M.config.MODULE_DEV_TAG + '_');

function getFile (module, scriptPath, callback) {

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
            callback(null, content);
        } else {
            // write file if not in production mode
            fs.writeFile(absPath, content, callback);
        }
    });
}

function getFileData (module, scripts, callback) {
   
    var data = '';
    var count = 0;

    for (var i = 0, l = scripts.length; i < l; ++i) {
        getFile(module, scripts[i], function(err, content) {
            if (err) {
                console.error('Failed to wrap client script: ' + err.toString());
            } else if (M.config.log.moduleInstallation || M.config.logLevel === 'verbose') {
                console.log('Wrapped module client script');
            }
            
            data += content;

            if (++count === l) {
                callback(null, data);
            }
        });
    } 
}

function wrapScripts (module, scripts, callback) {
    
    callback = callback || function () {};

    getFileData(module, scripts, function (err, data) {
        
        if (err) {
            return callback(err);
        }

        if (M.config.compressFiles) {
            
            var absPath = M.config.MODULE_ROOT + module.getVersionPath() + '/' + module.name + '.js';

            zlib.gzip(UglifyJS.minify(data, {fromString: true}).code, function (err, data) {
                fs.writeFile(absPath, data, callback);
            }); 
        } else {
            callback();
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

exports.wrapScripts = wrapScripts;
exports.minify = minify;
