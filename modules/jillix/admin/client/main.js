define(["./stdl.tab", "./stdl.list", "./stdl.form"], function(list) {
    
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
    
    var vertexClassMenu = document.getElementById("vertexClassMenu");
    var vertexes = document.getElementById("vertexes");
    var noVertexSelected = document.getElementById("noVertexSelected");
    
    return {
        
        init: function() {
            
            var self = this;
            
            this.config = {
                
                Domains: {
                    
                    trucken: {
                        
                        type: "link",
                        linkedClass: "className"
                    },
                    
                    link2: {
                        
                        type: "linkset",
                        linkedClass: "className"
                    },
                    
                    edge: {
                        
                        type: "edge",
                        edgeClass: "className",
                        linkedClass: "className"
                    },
                    
                    field1: {
                        
                        type: "string"
                    }
                },
                
                Apps: {
                    
                    feschter: {
                        
                        type: "link",
                        linkedClass: "className"
                    },
                    
                    link2: {
                        
                        type: "linkset",
                        linkedClass: "className"
                    },
                    
                    edge: {
                        
                        type: "edge",
                        edgeClass: "className",
                        linkedClass: "className"
                    },
                    
                    field1: {
                        
                        type: "string"
                    }
                },
                
                Users: {},
                Roles: {},
                Modules: {},
                Operations: {}
            }
            
            this.obs.l("showVertexBox", function(vertexClass){
                    
                for (var ref in self.vertexBoxRefs) {
                    
                    if (ref !== vertexClass) {
                        
                        self.vertexBoxRefs[ref].style.display = "none";
                    }
                }
                    
                if (self.vertexBoxRefs[vertexClass]) {
                
                    noVertexSelected.style.display = "none";
                    
                    self.vertexBoxRefs[vertexClass].style.display = "block";
                }
                else {
                    
                    noVertexSelected.style.display = "block";
                }
            });
            
            this.createMenuBar();
            this.createVertexBoxes();
        },
        
        vertexBoxRefs: {},
        
        addEventToMenuBarItem: function(element, vertexClass) {
            
            var self = this;
            
            element.addEventListener("mouseup", function(){
                
                self.obs.f("showVertexBox", vertexClass);
                
            }, false);
        },
        
        createMenuBar: function(config) {
            
            for (var vertexClass in this.config) {   
                
                var li = document.createElement("li");
                
                li.setAttribute("id", vertexClass);
                li.innerHTML = vertexClass;
                
                this.addEventToMenuBarItem(li, vertexClass);
                
                vertexClassMenu.appendChild(li);
            }
        },
        
        createVertexBoxes: function(config) {
            
            for (var vertexClass in this.config) {
                
                var div = document.createElement("div");
                div.setAttribute("id", vertexClass);
                div.setAttribute("class", "vertexBox");
                
                // TODO create vertex box
                var temp = "Trucken";
                
                for (var field in this.config[vertexClass]) {
                    
                    temp += field + "<br/>";
                }
                
                div.innerHTML = temp;
                
                this.vertexBoxRefs[vertexClass] = div;
                
                vertexes.appendChild(div);
            }
        }
    }
});