require('../../api');

if (M.config.compressFiles) {
    M.module.minify(M.config.root + '/lib/client/M.js', true, function (err) {
        process.exit(0);
    });
}
