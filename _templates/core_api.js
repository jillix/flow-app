var proxy = {
    killAllApplications: function (err) {
        for (var host in M.cache.apps.cache) {
            
            if (M.cache.apps.cache[host] && M.cache.apps.cache[host].pid) {
                process.kill(M.cache.apps.cache[host].pid);
            }
        }
        
        if (err) {
            console.error(err.message);
            console.error(err.stack);
            return process.exit(1);
        }
        
        process.exit();
    }
};

function getFromHost () {
    
}

function getPid () {
    
}