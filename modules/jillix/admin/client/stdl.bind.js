define(function() {
    
    var defaults = {
        
        hideMediaOnError: true
    };
    
    // TODO create filters
    var filters = {
        
        max: function(value, number) {
            
        },
        
        min: function(value, number) {
        
        },
        
        fixed: function(value, decPlaces) {
        
        },
        
        maxChars: function(value, number) {
        
        },
        
        minChars: function(value, number) {
        
        },
        
        int: function(value, radix) {
            
            return parseInt(value, radix || 10) || 0;
        },
        
        float: function(value) {
            
            return parseFloat(value) || 0;
        }
    };
    
    var mediaTags = {
        
        img: "src",
        audio: "src",
        video: "src",
        object: "data"
    };
    
    return function(config) {
        
        /*
        config = {
        
            value: "i am the content", //mandatory!
            element: HTMLElement, //mandatory!
            selector: "",
            hideMediaOnError: false,
            defaultMediaUrl: "",
            filters: {
                
                name: "fixed",
                places: 2,
                max: 32,
                min: 1,
            },
            pre: "./image/",
            post: ".jpg",
            events: {
                
                "click": [
                    
                    {
                        //fn: "¿functionName?",
                        params: [1, 2, "3"]
                    }
                ]
            },
            attr: "class"
        };
        */
        
        //get dom element and check mandatory attributes
        if (config && config.element instanceof HTMLElement && typeof config.value === "string") {
        
            if (config.selector) {
                
                config.element = config.element.querySelector(config.selector);
                
                if (!config.element) {
                    
                    return;
                }
            }
        }
        else {
        
            return;
        }
        
        // TODO bind error event to media
        if (mediaTags[config.element.tagName.toLowerCase()]) {
            
            /*
            //hide images on 404
		    for( var i=0, l=dom.length; i<l; ++i ) {
		        
		        if( dom[ i ].tagName.toLowerCase() == "img" ) dom[ i ].bind( "error", (function( img ){
		        
		        	return function(){ img.style.visibility = "hidden"; }
		        
		        })( dom[ i ] ));
		    }
            */
        }
       
        if (typeof config.filters === "object") {
            
            for (var filter in config.filters) {
                
                if (filters[filter]) {
                    
                    config.value = filters[filter](config.value, filters[filter]);
                }
            }
        }
        
        //attach pre/post values
        config.value = (config.pre || "") + config.value + (config.post || "");
        
        if (typeof config.events === "object") {
            
            // TODO bind events
        }
        
        //set content
        if (typeof config.attr === "string") {
            
            config.element.setAttribute(config.attr, config.value);
        }
        else {
            
            config.element.innerHTML = config.value;
        }
    };
});

/*
// !TODO: bind events to dom(s)
this.event = function( events, data, item, range ) {
	
	if( events ) for( var i=0, l=events.length; i<l; ++i ) {
		
		if( !item && events[ i ].selector ) item = N.dom.find( events[ i ].selector, range ) || range;
        
        if( item ) {
        
        	//instance handler
        	if( this.inst[ events[ i ].handler ] ) {
        	
        	    item.bind( events[ i ].event, (function( handler, item_data, item ) {
        	        
        	        return function( event ){ handler( event, item_data, item ); }
        	    
        	    })( this.inst[ config.events[ i ].handler ], data, item ));
        	}
        	
        	//fire observer event
        	if( config.events[ i ].fire ) {
        	    
        	    item.bind( events[ i ].event, (function( obs, event_name, args, item_data, item ) {
        	        
        	        return function() { obs.f( event_name, item_data, args, item ); }
        	        
        	    })(
        	    	events[ i ].view && this.inst[ events[ i ].view ] ? this.inst[ events[ i ].view ].obs : this.inst.obs,
        	    	events[ i ].fire,
        	    	events[ i ].args,
        	    	data,
        	    	item
        	    ));
        	}
        }
	}
}
*/