define(["list/list"], function() {
        
        //collect dom references
    var cssNs = "div.adminMain",
        refUsers = N.dom.findOne(cssNs + " #users"),
        refRoles = N.dom.findOne(cssNs + " #roles"),
        refOperations = N.dom.findOne(cssNs + " #operations"),
        refModules = N.dom.findOne(cssNs + " #modules"),
        refLeftMessage = N.dom.findOne(cssNs + ">div#itemsLeft>div.message"),
        refItemList = N.dom.findOne(cssNs + ">div#itemsLeft>ul.list"),
        refItemSearch = N.dom.findOne(cssNs + ">div#itemsLeft ul.second"),
        refItemAdd = N.dom.findOne(cssNs + ">div#itemsLeft>ul.bottom>li.add"),
        refItemRemove = N.dom.findOne(cssNs + ">div#itemsLeft>ul.bottom>li.remove"),
        refItemPaging = N.dom.findOne(cssNs + ">div#itemsLeft>ul.bottom>li.paging"),
        refDetailForm = N.dom.findOne(cssNs + ">div#itemDetail>div.detail"),
        refDetailMessage = N.dom.findOne(cssNs + ">div#itemDetail>div.noDetail"),
        refDetailCancel = N.dom.findOne(cssNs + ">div#itemDetail>ul.bottom>li.cancel"),
        
        // TODO: bind viewstates to events
        viewStates = {
            
            category: [
                {
                    elm: refLeftMessage,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refItemList,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refItemAdd,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refItemRemove,
                    style: "display",
                    value: "block"
                }
            ],
            noCategory: [
                {
                    elm: refLeftMessage,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refItemList,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refItemAdd,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refItemRemove,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refItemPaging,
                    style: "display",
                    value: "none"
                }
            ],
            items: [
                {
                    elm: refLeftMessage,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refItemList,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refItemSearch,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refItemPaging,
                    style: "display",
                    value: "block"
                }
            ],
            noItems: [
                {
                    elm: refLeftMessage,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refItemList,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refItemSearch,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refItemPaging,
                    style: "display",
                    value: "none"
                }
            ],
            detail: [
                {
                    elm: refDetailForm,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refDetailMessage,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refDetailCancel,
                    style: "display",
                    value: "block"
                }
            ],
            noDetail: [
                {
                    elm: refDetailForm,
                    style: "display",
                    value: "none"
                },
                {
                    elm: refDetailMessage,
                    style: "display",
                    value: "block"
                },
                {
                    elm: refDetailCancel,
                    style: "display",
                    value: "none"
                }
            ]
        };
    
    function showViewState(name) {
        
        if (viewStates && viewStates[name]) {
            
            for (var i = 0, l = viewStates[name].length; i < l; ++i) {
                
                if (viewStates[name][i].elm instanceof HTMLElement) {
                    
                    viewStates[name][i].elm.style[viewStates[name][i].style] = viewStates[name][i].value;
                }
            }
        }
    }
    
    showViewState("noItems");
    showViewState("noCategory");
    showViewState("noDetail");
    
    refUsers.bind("click", function() {
        
        showViewState("category");
        showViewState("noItems");
    });
    
    refRoles.bind("click", function() {
        
        showViewState("category");
        showViewState("items");
    });
    
    refOperations.bind("click", function() {
        
        showViewState("category");
        showViewState("noItems");
    });
    
    refModules.bind("click", function() {
        
        showViewState("category");
        showViewState("items");
    });
    
    return {
        
        init: function(config) {
            
            console.log(config);
        },
        
        //test function 1
        fn1: function() {
            
            console.log(arguments);
        },
        
        //test function 2
        fn2: function() {
            
            console.log(arguments);
        }
    };
});