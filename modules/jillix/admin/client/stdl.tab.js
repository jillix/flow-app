define(["adioo/bind/main"], function(Bind){
    
    var test = {
        
        name: "ruedi",
        hoi: function() {
            
            console.log(arguments[0] + this.name);
        }
    };
    
    N.obs("myObs").l("eventName", function() {
        
        console.log(arguments[0]);
    });
    
    //set default values
    var bind = Bind({
        
        scope: test,
        events: {
            
            "mousedown": [{
                
                method: "hoi",
                args: ["wer isch's gsi? de "]
            }],
            "mouseup": {
                
                method: "hoi",
                args: ["ich trucken mit em "]
            },
            
            "click": [{
                
                method: "hoi",
                args: ["dini mueter heisst "]
            }]
        },
        filters: {
            
            pre: "default PRE ",
            post: " default POST"
        },
    });
    
    bind({
        
        value: 12.5684,
        element: document.getElementById("noVertexSelected"),
        filters: {
            
            fixed: 2,
            post: " my Post content"
        },
        events: {
            
            "mousedown": [
                {
                    scope: N.obs("myObs"),
                    method: "f",
                    args: ["eventName", "arrrrrg!"]
                }
            ],
            
            "mouseup": {
                
                method: "hoi",
                args: ["my name is: "]
            },
            
            "click": {
                
                method: "hoi",
                args: ["ich bin de "]
            }
        }
    });
    
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