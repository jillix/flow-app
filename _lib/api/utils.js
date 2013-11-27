// create help info text
function help (usage, info, options, more, spaces) {

    if (arguments.length !== 5) {
        return 'printHelp: Invalid arguments';
    }
    
    spaces = parseInt(spaces, 10) || 20;
    
    usage = usage.split('\n');
    
    var text = 'Usage: ' + usage[0] + '\n';
    for (var i = 1, l = usage.length; i < l; ++i) {
        text += '       ' + usage[i] + '\n';
    }
    
    text += '\n';
    text += info + '\n';
    text += '\n';
    text += 'Options:\n';
    
    for (var option in options) {
        var row = ' ';
        
        if (options[option].short) {
            row += '-' + options[option].short + ', ';
        }
        
        row += '--' + option;
        
        if (options[option].description) {
            for (i = 0, l = (spaces - row.length); i < l; ++i) {
                row += ' ';
            }
            row += options[option].description;
        }
        
        text += row + '\n';
    }
    
    text += '\n';
    text += more;
    
    return text;
}

//get ip adress
var os = require("os");
function ip (version, internal) {
    
    var netIf = os.networkInterfaces();
    
    version = version || 4;
    internal = internal ? true : false;
    
    for (var netIfName in netIf) {
    
        for (var i = 0, l = netIf[netIfName].length; i < l; ++i) {
            
            if (
                netIf[netIfName][i] &&
                netIf[netIfName][i].internal == internal &&
                netIf[netIfName][i].family.toLowerCase() === "ipv" + version &&
                netIf[netIfName][i].address
            ) {
                
               return netIf[netIfName][i].address;
            }
        }
    }
    
    return null;
}

exports.help = help;
exports.ip = ip;
