function handleAttributes( view, item, remove, active ){
	
	for( var cid in view.index ) {
                
	    if( active ) {
	    	
	    	var remItem = N.dom.findOne( active, view.index[ cid ] );
	    	
	    	if( remItem ) remItem.remAttr({ "class": "active" });
	    }
	    else view.index[ cid ].remAttr({ "class": "active" });
	}
	
	if( remove ) for( var i=0, l=remove.length; i<l; ++i ) {
		
		var removeItem = N.dom.findOne( remove[ i ], view.inst.dom );
        
        if( removeItem ) {
        
        	if( active ) {
        	
			    var remItem = N.dom.findOne( active, removeItem );
			    
			    if( remItem ) remItem.remAttr({ "class": "active" });
			}
			else removeItem.remAttr({ "class": "active" });
        }
	}
    
    if( active ) {
        
	    var addItem = N.dom.findOne( active, item );
	    
	    if( addItem ) addItem.addAttr({ "class": "active" });
	}
	else item.addAttr({ "class": "active" });
}

this.init = function( config ) {
    
    var view = this,
    	list = N.dom.findOne( config.list, view.inst.dom ),
    	defTitle = N.dom.findOne( config.defTitle, view.inst.dom ),
    	listTitle = N.dom.findOne( config.listTitle, view.inst.dom ),
    	remAttr = config.remAttr,
    	emptyMsg = N.dom.findOne( config.emptyMsg, view.inst.dom ),
    	loader = N.dom.findOne( config.loader, view.inst.dom );
  	
  	//i18n
  	view.inst.obs.l( "localeChange", function( locale ) {
  		
  		view.find();
  	});
  	
    //search
    view.obs.l( "searchStart", function( item ) {
        
        item.addAttr({ disabled: true });
    });
    
    view.obs.l( "searchDone", function( item ) {
        
        item.remAttr( "disabled" );
    });
    
    // TODO: add new list-items
    /*if( config.add ) {
        
        var add = N.dom.findOne( config.add, view.inst.dom );
        if( add ) console.log( "add" );
    }*/
    
    if( config.empty ) {
    
        var item = N.dom.findOne( config.empty.selector, view.inst.dom );
        
        if( item && view.inst[ config.empty.view ] ) item.bind( config.empty.event || "click", function( event ){
            
            if( config.empty.fire ) {
                
                view.inst[ config.empty.view ].obs.f( config.empty.fire, config.empty.args );
                
                for( var cid in view.index ) {
                
                    view.index[ cid ].remAttr({ "class": "active" });
                }
            }
        });
    }
    
    //listen to events
	if( listTitle ) view.obs.l( "setListTitle", function( data, key ) {
        
        //toggle list titles
        if( defTitle ) defTitle.style.display = "none";
        if( listTitle ) listTitle.style.display = "block";
        
        if( data[ key ] ) listTitle.innerHTML = data[ key ];
    });
    
    view.obs.l( "listLoadData", function( data, queryPattern ) {
        
        var find = {};
        
        if( data && data._c && queryPattern ) {
            
            for( var key in queryPattern ) {
                
                if( data[ queryPattern[ key ] ] ) find[ key ] = data[ queryPattern[ key ] ];
            }
        }
        
        view.find( find );
    });
    
    //reset list and show default category
    view.obs.l( "listReset", function( item, query ) {
        
        //toggle list titles
        if( listTitle ) listTitle.style.display = "none";
        if( defTitle ) defTitle.style.display = "block";
        
        if( item ) handleAttributes( view, item, remAttr, config.active );
        
        if( query ) view.find( query );
    });
    
    view.obs.l( "findEmpty", function(){
    	
    	if( emptyMsg ) emptyMsg.style.display = "block";
    });
    
    view.obs.l( "findData", function(){
    	
    	if( emptyMsg ) emptyMsg.style.display = "none";
    });
    
    view.obs.l( "itemHandler", function( item, data ) {
        
        //visual fx
        item.bind( "click", function( event ) {
            
            event.stopPropagation();
            
            handleAttributes( view, item, remAttr, config.active );
        });
        
        // TODO: accordion
        
        // TODO: sort
        
        // TODO: drop target
        
        // TODO: select multiple items
        
        // TODO: tree?
    });
    
    view.obs.l( "findStart", function() {
    	
    	if( list ) list.style.display = "none";
    	if( loader ) loader.style.display = "block";
    });
    
    view.obs.l( "findDone", function() {
    	
    	if( list ) list.style.display = "block";
    	if( loader ) loader.style.display = "none";
    });
};