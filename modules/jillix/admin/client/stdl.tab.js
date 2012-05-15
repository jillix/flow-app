define(["adioo/bind/main"], function(bind){
    
    var Tab = {
        
        show: function() {
            
        }
    };
    
    return function(config) {
        
        config = {
            
            item:       "li",
            itemHTML:   "<span class='content1'></span>",
            content: [
                {
                    
                }
            ]
        };
        
        // 1. get dom refs or set mode to create
        
        var tab = N.clone(Tab);
        
        return tab;
    }; 
});