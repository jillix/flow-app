define(["adioo/bind/tab"], function(Menu) {
    
    return {
        
        init: function(config) {
            
            var tab = Menu({
                
                inst: this,
                target: this.$.querySelector("#vertexClassMenu"),
                itemTag: "li",
                source: {
                    
                    name: "operationName",
                    path: "ich/bin/de/ruedi",
                    data: {hoi:"ruedi"}
                },
                bind: {
                    
                    events: 
                }
            });
            
            tab.render([
                
                [{val: "Domains"}],
                [{val: "Apps"}],
                [{val: "Users"}],
                [{val: "Roles"}],
                [{val: "Modules"}],
                [{val: "Operations"}]
            ]);
            
            //tab.fetch();
        }
    }
});