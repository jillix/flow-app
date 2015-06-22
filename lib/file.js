var EventEmiter = require('events').EventEmitter;
var fs = require('fs-extra');
var watch = require("fwatcher");
var zlib = require('zlib');
var mime = require('mime');
var crypto = require('crypto');
var minifyHtml = require('html-minifier').minify;
var minifyCSS =  require('clean-css');
var UglifyJS = require('uglify-js');
var Cache = require('./cache');

var fileCache = Cache('files');
var html_minifier_options = {
    removeComments: true,
    removeCommentsFromCDATA: true,
    removeCDATASectionsFromCDATA: true,
    removeAttributeQuotes: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    collapseBooleanAttributes: true,
    collapseWhitespace: true
};

// regular expressions
var suffix = /\.\w+$/;
var checkFp = /\.@[a-z0-9]{7}\.(?:js|css|html)$/i;
var replaceDoubleSlash = /\/{2,}/g;

// this is not quaranteed to be stable!
zlib.Z_DEFAULT_COMPRESSION = 9;

// TODO implement a observer to remove files, when dependent files change
var observer = new EventEmiter();

// update files on change
// combine and prepare file paths with external url and fingerprint
// stream data files

/**
 * Read and parse a JSON file.
 */
exports.json = function (path, callback) {
    
    fs.readJson(path, function (err, object) {
        
        if (err) {
            return callback(err);
        }
        
        if (!object) {
            callback(new Error('JSON file "' + path + '" not found.'));
        }
        
        // TODO watch file
        
        callback(null, object);
    });
};

/**
 * Prepare external component file paths.
 *
 * @public
 * @param {object} The load context, ex a module package.
 * @param {function} The callback function.
 */
exports.prepare = function (components, callback) {
    
    // check input data
    var files = {};
    var lastScript;
    
    if (components.scripts instanceof Array) {
        lastScript = components.scripts[components.scripts.length - 1];
        files.scripts = components.scripts;
    }
    
    if (components.styles instanceof Array) {
        files.styles = components.styles;
    }
    
    if (components.markup instanceof Array) {
        files.markup = components.markup;
    }
    
    // return components object, if there are no files to prepare
    if (!files.scripts && !files.styles && !files.markup) {
        return callback(null, components);
    }
    
    // set apps public folder as default base path
    var base = components.base || engine.paths.app_public;
    
    var countDown = 0;
    var combinedFile = {
        base: base,
        path: lastScript,
        read: base + lastScript,
        maxAge: engine.http.maxAge_fingerprint,
        module: components.module,
        data: '',
        files: []
    };
    var handler = function (err, file, context) {
        
        if (err) {
            if (--countDown === 0) {
                callback(null, components);
            }
            return;
        }
        
        // TODO combine files
        if (engine.production && context.type === 'scripts') {

            // collect files to remove later from cache
            combinedFile.files.push(file.read);

            // concatenate data 
            combinedFile.data += file.data;
            
        } else {
            files[context.type][context.index] = file.ext;
        }
        
        if (--countDown === 0) {
          
            if (engine.production && files.scripts && combinedFile) {
                
                // TODO remove combined files from cache
              
                createFileDescriptor(combinedFile, combinedFile.data, function (err, file) {
                    
                    if (err) {
                        console.log(err);
                        return callback(err);
                    }
                    
                    files.scripts = [file.ext];
                    
                    callback(null, files);
                });
                
                return;
            }
            
            callback(null, files);
        }
    };
    
    // get file data
    var type, i, l, context;
    for (type in files) {
        
        // get file count
        countDown += l = files[type].length;
        
        for (i = 0; i < l; ++i) {
            
            context = {type: type, index: i};
            
            // ignore external files
            if (files[type][i].indexOf('//') > -1) {
                handler(null, {ext: files[type][i]}, context);
            }
          
            this.get({
                path: files[type][i],
                // set public app folder for public files and the markup folder for markup files
                base: files[type][i][0] === '/' ? (type === 'markup' ? engine.paths.app_markup : engine.paths.app_public) : base,
                wrap: files[type][i] === 'resource.js' ? false : true,
                module: components.module,
                maxAge: engine.http.maxAge_fingerprint,
                noCompression: engine.production && type === 'scripts' ? true : false
            }, handler, context);
        }
    }
};

/**
 * Read a file or get it from the cache.
 *
 * @public
 * @param {mixed} The file descriptor or path.
 * @param {function} The callback function.
 * @param {object} An object with context informations.
 */
exports.get = function (file, callback, context) {
    
    // check file
    if (!file.path || !file.base) {
        return callback(new Error('Missing file path or file base.'), undefined, context);
    }
    
    // create a clean path without the fingerprint
    file.path = removeFingerprint(file.path);

    // create absolute path
    file.read = (file.base + file.path).replace(replaceDoubleSlash, '/');

    // get file from cache
    var cachedFile = fileCache.get(file.read);
    if (cachedFile) {
        return callback(null, cachedFile, context);
    }
    
    // read the file from the file system
    fs.readFile(file.read, function (err, data) {

        if (err) {
            return callback(err, undefined, context);
        }
        
        // get the modification time
        fs.stat(file.read, function (err, stats) {
    
            if (err) {
                return callback(err, undefined, context);
            }
            
            file.mtime = stats.mtime;
            
            createFileDescriptor(file, data, callback, context);
        });
        
        // watch for file changes
        /*if (!cachedFile || cachedFile.data !== null) {
            watch(file.read, function (err) {
                if (err) {
                    return console.error(err);
                }

                // remove cached data on file change, to force reload
                console.log('FILE CHANGE:', file.read);

                // set file data to null
                file.data = null;

                // update file cache
                fileCache.set(file.read, file);
            });
        }*/
        
        
    });
};

function createFileDescriptor (file, data, callback, context) {
  
    // get file type
    file.type = mime.lookup(file.path);
    
    // append slash to module id or reset module value if it's a public path
    if (file.module) {
        file.module = file.path[0] === '/' ? '' : file.module + '/';
    }

    // minify js, html or css
    switch (file.type) {
        case 'text/html':

            // TODO don't compress as long html imports or binary ws data is available
            file.noCompression = true;
            data = minifyHtml(data.toString(), html_minifier_options);
            break;

        case 'text/css':
            if (engine.production) {
                data = new minifyCSS({processImport: false}).minify(data.toString()).styles;
            }
            break;

        case 'application/javascript':

            // wrap javascript files, except the engine client
            if (file.wrap) {
                data = "E('" + ((file.module || '')  + file.path) + "',function(require,module,exports,global,engine){\n" + data.toString() + "\nreturn module});";
            }

            if (engine.production && (data = UglifyJS.minify(data.toString(), {fromString: true}))) {
                data = data.code;
            }
            break;
    }

    // create fingerprint
    file.fp = crypto.createHash('md5').update(data).digest('hex').substr(0, 7);
    
    // create external path
    if (suffix.test(file.path)) {
        file.ext = file.path.split('.');
        file.ext.splice(-1, 0, '@' + file.fp);
        file.ext = file.ext.join('.');
    } else {
        file.ext = file.path + '.@' + file.fp;
    }
    
    // prepend module id to path
    file.ext = (file.module || '') + file.ext;

    // add the data to the file object
    file.data = data;

    // don't compress data
    if (file.noCompression) {
        return createCacheObject(file, callback, context);
    }

    zlib.gzip(file.data, function (err, data) {

        if (err) {
            return callback(err, undefined, context);
        }

        // update file data with compressed data
        file.data = data;

        createCacheObject(file, callback, context);
    });
}

/**
 * Create an cache object with the data buffer and the http headers.
 *
 * @private
 */
function createCacheObject (file, callback, context) {

    // create http headers
    // TODO send not modified for non scrips and css
    file.http = {
        'Vary': 'Accept-Encoding',
        'Cache-Control': 'public, max-age=' + (file.maxAge || engine.http.maxAge),
        'Content-Length': file.data.length,
        'Content-Type': file.type,
        'Etag': file.fp
    };
    
    // set last modified header
    if (file.mtime) {
        file.http['Last-Modified'] = file.mtime;
    }
    
    // send encoding header
    if (!file.noCompression) {
        file.http['Content-Encoding'] = 'gzip';
    }

    // save zipped data in cache
    fileCache.set(file.read, file);
    
    // return data
    callback(null, file, context);
}

/**
 * Remove fingerprint from path
 *
 * @private
 * @param {string} The file path.
 */
function removeFingerprint (path) {

    // remove fingerprint if it's found in path
    if (checkFp.test(path)) {

        // split path
        path = path.split('.');

        // remove fingerprint from read path
        path.splice(path.length - 2, 1);

        // create path without fingerprint
        path = path.join('.');
    }

    // return path
    return path;
}
