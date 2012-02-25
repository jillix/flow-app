define(["list/list"], function() {
        
        //collect dom references
    var cssNs = "div.adminMain",
        refUsers = N.dom.findOne(cssNs + " #users"),
        refRoles = N.dom.findOne(cssNs + " #roles"),
        refOperations = N.dom.findOne(cssNs + " #operations"),
        refModules = N.dom.findOne(cssNs + " #modules"),
        refItemList = N.dom.findOne(cssNs + ">div#itemsLeft>ul.list"),
        refItemMessage = N.dom.findOne(cssNs + ">div#itemsLeft>div.noSelection"),
        refItemAdd = N.dom.findOne(cssNs + ">div#itemsLeft>ul.bottom>li.add"),
        refItemRemove = N.dom.findOne(cssNs + ">div#itemsLeft>ul.bottom>li.remove"),
        refItemPaging = N.dom.findOne(cssNs + ">div#itemsLeft>ul.bottom>li.paging"),
        refDetailForm = N.dom.findOne(cssNs + ">div#itemDetail>div.detail"),
        refDetailMessage = N.dom.findOne(cssNs + ">div#itemDetail>div.noSelection"),
        refDetailCancel = N.dom.findOne(cssNs + ">div#itemDetail>ul.bottom>li.cancel"),
        
        viewStates = {
            
            category: [
                {
                    elm: refItemMessage,
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
                },
                {
                    elm: refItemPaging,
                    style: "display",
                    value: "block"
                }
            ],
            noCategory: [
                {
                    elm: refItemMessage,
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
            item: [
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
            noItem: [
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
    
    return {
        
        init: function(config) {
            
            refUsers.bind("click", function(){
                
                showViewState("category");
            });
            
            refRoles.bind("click", function(){
                
                showViewState("category");
            });
            
            refOperations.bind("click", function(){
                
                showViewState("category");
            });
            
            refModules.bind("click", function(){
                
                showViewState("category");
            });
            
            showViewState("noCategory");
            showViewState("noItem");
        }
    };
});