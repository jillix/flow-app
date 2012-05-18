define(["adioo/bind/main"], function(Bind) {
    
    var List = {
        
        fetch: function(operation, data, callback) {
            
            var self = this;
            
            operation = operation || this.operation;
            
            if (operation === undefined) {
                
                return callback("No operation given");
            }
            
            var options = this.options || {};
            
            if (data) {
                
                options.data = data;
            }
            
            self.obs.f("fetchStart");
            
            N.link(operation, options, function(err, result) {
                
                if (err) {
                    
                    self.obs.f("fetchError");
                    return callback(err);
                }
                
                self.render(result);
                
                self.obs.f("fetchDone", result);
                
                return callback(null, result);
            });
        },
        
        render: function(data) {
            
            if (!(data instanceof Array)) {
                
                return;
            }
            
            var df = document.createDocumentFragment();
            
            for (var i = 0, l = data.length; i < l; ++i) {
                
                var item = document.createElement(this.itemTag);
                item.innerHTML = this.itemHTML;
                
                var bind = Bind({elm: item});
                
                for (var n = 0, l = data[i].length; n < l; ++n) {
                
                    bind(data[i][n]);
                }
                
                df.appendChild(item);
            }
            
            this.target.innerHTML = "";
            this.target.appendChild(df);
        }
    };
    /*
        config = {
            
            i18n: false, //true is default,
            addItem: "#addItemButton",
            removeItem: "#removeItemButton",
            search: [
                {
                    elm: "#searchField",
                    ??
                }
            ],
            paging: 33,
            source: "getMyData" || [
                [
                    {
                        val: "content1",
                        query: ".name"
                    },
                    {
                        val: "content2",
                        query: ".edit",
                        events: {
                            
                            mouseup: {
                                
                                method: "myFunction",
                                args: ["xyz"]
                            }
                        }
                    }
                ]
            ],
            itemTag: "li",
            itemHTML: "<span class='name'></span><img class='edit' src='edit.png'/>",
        }
        
        // TODO:
        - locale change
        - search data
        - add item
        - remove item
        - paging
    */
    return function(config) {
        
        var list = N.clone(List);
        
        //listen for i18n change event
        if (config.i18n) {
            
            N.obs("i18n").l("change", function(locale) {
                
                //list.fetch() ??
            });
        }
        
        return list;
    };
});