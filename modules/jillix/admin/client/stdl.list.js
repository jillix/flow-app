define(function(){
    
    var List = {
        
        update: function(operation, data, callback) {
            
            operation = operation || this.operation;
            
            if (operation === undefined) {
                
                return callback("No operation given");
            }
            
            var options = this.options || {};
            
            if (data) {
                
                options.data = data;
            }
            
            N.link(operation, options, function(err, result) {
                
                
            });
        }
    };
    
    return function(config) {
        
        var list = N.clone(List);
        
        return list;
    };
});