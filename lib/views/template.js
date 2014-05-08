var fs = require('fs');
var M = process.mono;

// get html snipptets (ws)
function html (err, data) {
    var self = this;
    
    if (!data) {
        return self.emit('<html', 'No path given');
    }
    
    var file = M.config.paths.TEMPLATE_ROOT + data.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    fs.readFile(file, {encoding: 'utf8'}, function (err, data) {
        
        if (err) {
            return self.emit('<html', 'File not found');
        }
        
        self.emit('<html', null, data);
    });
}

function Template (moduleInstance) {
    moduleInstance.on('html>', html);
}

module.exports = Template;
