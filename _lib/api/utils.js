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

exports.ip = ip;
