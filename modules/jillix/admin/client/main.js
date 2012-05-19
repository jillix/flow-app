define(["adioo/bind/menu", "adioo/bind/list"], function(Menu, List) {
    
    return {
        
        init: function(config) {
            
            var list = List({
                
                inst: this,
                target: this.$.querySelector("#vertexClassMenu"),
                itemTag: "li",
                source: {
                    
                    name: "operationName",
                    path: "ich/bin/de/ruedi",
                    data: {hoi:"ruedi"}
                }
            });
            
            list.render([
                
                [
                    {val: "Domains"},
                    {val: "domains", attr: "id"}
                ],
                [
                    {val: "Apps"},
                    {val: "apps", attr: "id"}
                ],
                [
                    {val: "Users"},
                    {val: "users", attr: "id"}
                ],
                [
                    {val: "Roles"},
                    {val: "roles", attr: "id"}
                ],
                [
                    {val: "Modules"},
                    {val: "modules", attr: "id"}
                ],
                [
                    {val: "Operations"},
                    {val: "operations", attr: "id"}
                ]
            ]);
            
            //list.fetch();
        }
    }
});