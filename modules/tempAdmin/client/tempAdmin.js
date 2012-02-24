define(["list/list"], function() {
        
        //collect dom references
    var cssNs = "div#adminMain",
        refItemList = N.dom.findOne(cssNs + "itemsLeft."),
        refItemMessage = N.dom.findOne(cssNs + ""),
        refItemAdd = N.dom.findOne(cssNs + ""),
        refItemRemove = N.dom.findOne(cssNs + ""),
        refItemPaging = N.dom.findOne(cssNs + ""),
        refDetailForm = N.dom.findOne(cssNs + ""),
        refDetailMessage = N.dom.findOne(cssNs + ""),
        refDetailCancel = N.dom.findOne(cssNs + ""),
        
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
    
    return {
        
        init: function(config) {
            
            console.log(this.comp);
        }
    };
});