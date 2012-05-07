define(["faeb187/stdl.list/main"], function(list) {
    
    var Vertex = (function(V) {
        
        V = {
            
            
        };
        
        return function(config) {
            
            var vertex = N.clone(V);
            
            // TODO configure vertex
            
            return vertex;
        };
    })();
    
    var Edge = (function(E) {
        
        E = {
            
            
        };
        
        return function(config) {
            
            var edge = N.clone(E);
            
            // TODO configure edge
            
            return edge;
        };
    })();
    
    return {
        
        init: function(config) {
            
            config = {
                
                className: {
                    
                    link1: {
                        
                        type: "link",
                        linkedClass: "className"
                    },
                    
                    link2: {
                        
                        type: "linkset",
                        linkedClass: "className"
                    },
                    
                    edge: {
                        
                        type: "edge",
                        edgeClass: "className"
                        linkedClass: "className"
                    },
                    
                    field1: {
                        
                        type: "string"
                    }
                }
            }
        }
    }
});