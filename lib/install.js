var exec = require('child_process').exec

module.exports = function (script) {
    console.log(script);
    exec(script, (err, stdout, stderr) => {
        if (err) {
            throw err;
        }
    })
};
